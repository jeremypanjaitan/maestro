"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Session, type SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planSessions, type ScheduleInput } from "@/lib/domain/generateSessions";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import { hasConflict, type Slot } from "@/lib/domain/conflict";

export type SessionActionResult = { ok: true } | { ok: false; error: string };

export type SessionAccessResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

export type GenerateSessionsResult =
  | { ok: true; created: number }
  | { ok: false; error: string };

/** Statuses this file is allowed to set directly. RESCHEDULE is excluded: it
 * needs to create/link a replacement session, which is `rescheduleSession`'s
 * job (Task 16), not a plain status flip. */
const SETTABLE_STATUSES: SessionStatus[] = [
  "SCHEDULED",
  "HADIR",
  "MURID_TIDAK_HADIR",
  "GURU_TIDAK_HADIR",
  "CANCEL",
];

/** Defense-in-depth: re-checks the ADMIN role inside the action itself,
 * in addition to the `app/admin/layout.tsx` guard that renders the UI. */
async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Tidak diizinkan" };
  }
  return null;
}

/**
 * Ownership guard shared by every action that mutates an existing session.
 *
 * SECURITY: role and teacherId are re-derived from `auth()` on every call,
 * never trusted from the caller. ADMIN may act on any session. GURU may act
 * only on sessions where `session.teacherId === auth().user.teacherId`.
 * Everyone else (including unauthenticated callers) is denied.
 */
export async function requireSessionAccess(sessionId: string): Promise<SessionAccessResult> {
  const authSession = await auth();
  if (!authSession?.user) {
    return { ok: false, error: "Tidak diizinkan" };
  }

  const target = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!target) {
    return { ok: false, error: "Sesi tidak ditemukan" };
  }

  if (authSession.user.role === "ADMIN") {
    return { ok: true, session: target };
  }

  if (authSession.user.role === "GURU" && authSession.user.teacherId === target.teacherId) {
    return { ok: true, session: target };
  }

  return { ok: false, error: "Tidak diizinkan" };
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/**
 * Parses a "YYYY-MM-DD" string into a *local* midnight Date. Used only for
 * in-memory date arithmetic (feeding `planSessions`'s from/to bounds and day
 * -of-week iteration) — never write this straight into a `@db.Date` column,
 * see `toDbDate` from `@/lib/domain/dbDate`.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Generates sessions for every ACTIVE schedule within [fromISO, toISO]
 * (inclusive, "YYYY-MM-DD"). Idempotent: a session already generated for a
 * given (scheduleId, date) pair is skipped, so calling this twice with the
 * same range never creates duplicates.
 */
export async function generateSessions(
  fromISO: string,
  toISO: string,
): Promise<GenerateSessionsResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const from = parseLocalDate(fromISO);
  const to = parseLocalDate(toISO);
  if (
    !fromISO.match(/^\d{4}-\d{2}-\d{2}$/) ||
    !toISO.match(/^\d{4}-\d{2}-\d{2}$/) ||
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from > to
  ) {
    return { ok: false, error: "Rentang tanggal tidak valid" };
  }

  const schedules = await prisma.schedule.findMany({ where: { active: true } });
  const scheduleInputs: ScheduleInput[] = schedules.map((s) => ({
    id: s.id,
    teacherId: s.teacherId,
    studentId: s.studentId,
    instrument: s.instrument,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
  }));

  const existingSessions = await prisma.session.findMany({
    where: {
      scheduleId: { not: null },
      date: { gte: toDbDate(fromISO), lte: toDbDate(toISO) },
    },
    select: { scheduleId: true, date: true },
  });

  const existingKeys = new Set(
    existingSessions.map((s) => `${s.scheduleId}|${formatDbDate(s.date)}`),
  );

  const planned = planSessions(scheduleInputs, from, to, existingKeys);

  if (planned.length > 0) {
    await prisma.session.createMany({
      data: planned.map((p) => ({
        scheduleId: p.scheduleId,
        teacherId: p.teacherId,
        studentId: p.studentId,
        date: toDbDate(p.date),
        startTime: p.startTime,
        durationMinutes: p.durationMinutes,
        status: "SCHEDULED",
      })),
    });
  }

  revalidatePath("/admin/sessions");
  return { ok: true, created: planned.length };
}

/**
 * Sets a session's status directly. Does not handle RESCHEDULE — that
 * transition creates/links a replacement session and belongs to
 * `rescheduleSession` (Task 16).
 *
 * SECURITY: ADMIN may update any session; GURU may only update sessions
 * where `session.teacherId === auth().user.teacherId` (enforced by
 * `requireSessionAccess`, which re-derives role/teacherId from `auth()`).
 */
export async function updateSessionStatus(
  sessionId: string,
  status: string,
): Promise<SessionActionResult> {
  const access = await requireSessionAccess(sessionId);
  if (!access.ok) return access;

  if (!SETTABLE_STATUSES.includes(status as SessionStatus)) {
    return { ok: false, error: "Status tidak valid" };
  }

  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: status as SessionStatus },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Sesi tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/sessions");
  revalidatePath("/guru/sessions");
  return { ok: true };
}

/** Cancels a session (sets status to CANCEL). GURU may cancel their own
 * sessions; ADMIN may cancel any (ownership enforced by `updateSessionStatus`
 * -> `requireSessionAccess`). */
export async function cancelSession(sessionId: string): Promise<SessionActionResult> {
  return updateSessionStatus(sessionId, "CANCEL");
}

/**
 * Reschedules a session to a new date/time: the original session is marked
 * RESCHEDULE and linked (`rescheduledToId`) to a brand-new SCHEDULED session
 * carrying the same teacher/student/duration. Rejects if the new slot
 * conflicts with another still-active session (same teacher OR same student,
 * overlapping time) on the new date — reusing the same `hasConflict` domain
 * logic as schedule creation.
 *
 * SECURITY: ownership enforced by `requireSessionAccess` (GURU: own sessions
 * only; ADMIN: any session).
 */
export async function rescheduleSession(
  sessionId: string,
  newDateISO: string,
  newStartTime: string,
): Promise<SessionActionResult> {
  const access = await requireSessionAccess(sessionId);
  if (!access.ok) return access;
  const original = access.session;

  if (
    !newDateISO.match(/^\d{4}-\d{2}-\d{2}$/) ||
    !newStartTime.match(/^\d{2}:\d{2}$/)
  ) {
    return { ok: false, error: "Tanggal atau jam tidak valid" };
  }

  if (original.status === "RESCHEDULE" || original.status === "CANCEL") {
    return { ok: false, error: "Sesi ini sudah direschedule atau dibatalkan" };
  }

  const newDate = toDbDate(newDateISO);

  const sameDaySessions = await prisma.session.findMany({
    where: {
      date: newDate,
      status: { notIn: ["CANCEL", "RESCHEDULE"] },
      id: { not: original.id },
    },
    select: { teacherId: true, studentId: true, startTime: true, durationMinutes: true },
  });

  const candidate: Slot = {
    teacherId: original.teacherId,
    studentId: original.studentId,
    startTime: newStartTime,
    durationMinutes: original.durationMinutes,
  };

  if (hasConflict(candidate, sameDaySessions)) {
    return { ok: false, error: "Jadwal pengganti bentrok dengan sesi lain" };
  }

  await prisma.$transaction(async (tx) => {
    const newSession = await tx.session.create({
      data: {
        scheduleId: null,
        teacherId: original.teacherId,
        studentId: original.studentId,
        date: newDate,
        startTime: newStartTime,
        durationMinutes: original.durationMinutes,
        status: "SCHEDULED",
      },
    });

    await tx.session.update({
      where: { id: original.id },
      data: { status: "RESCHEDULE", rescheduledToId: newSession.id },
    });
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/guru/sessions");
  return { ok: true };
}
