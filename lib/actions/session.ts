"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planSessions, type ScheduleInput } from "@/lib/domain/generateSessions";

export type SessionActionResult = { ok: true } | { ok: false; error: string };

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
 * see `toDbDate` below.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Converts a "YYYY-MM-DD" string into the Date value that must be written to
 * (or compared against) a `@db.Date` Prisma column.
 *
 * Postgres `DATE` columns are timezone-less, but Prisma still round-trips
 * them through JS `Date` objects using their *UTC* fields. In a positive-UTC
 * -offset timezone (e.g. WIB, UTC+7), a locally-constructed midnight
 * (`new Date(y, m-1, d)`) is actually 17:00 UTC on the *previous* day, so
 * writing it lands the row on the wrong date. Constructing at UTC midnight
 * instead round-trips exactly. (Verified empirically against this project's
 * dev database — see task-14 report.)
 */
function toDbDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a `@db.Date` column value back to "YYYY-MM-DD" using UTC getters,
 * the mirror image of `toDbDate`. */
function formatDbDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
 */
export async function updateSessionStatus(
  sessionId: string,
  status: string,
): Promise<SessionActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

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
  return { ok: true };
}

/** Cancels a session (sets status to CANCEL). */
export async function cancelSession(sessionId: string): Promise<SessionActionResult> {
  return updateSessionStatus(sessionId, "CANCEL");
}
