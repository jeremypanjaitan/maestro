"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Session, type SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planSessions, type ScheduleInput } from "@/lib/domain/generateSessions";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import { hasConflict, type Slot } from "@/lib/domain/conflict";
import { perSessionRate } from "@/lib/domain/rate";

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

/** Same tightened HH:mm regex as `lib/validations/schedule.ts`'s `startTime`
 * field, kept in sync so both reject e.g. "13:99"/"99:99". */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates a "YYYY-MM-DD" string is both well-formed AND a real calendar
 * date — plain regex accepts "2026-02-30", which JS `Date` silently rolls
 * over to March 2. Round-tripping through `toDbDate`/`formatDbDate` (the
 * same UTC-anchored construction used to write/read the `@db.Date` column)
 * catches the rollover: if the formatted result doesn't match the input,
 * the date was invalid.
 */
function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return formatDbDate(toDbDate(dateStr)) === dateStr;
}

/** Validates a "HH:mm" clock time using the same tightened regex as
 * `lib/validations/schedule.ts`, rejecting hours/minutes out of range. */
function isValidClockTime(timeStr: string): boolean {
  return TIME_REGEX.test(timeStr);
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

  if (!isValidCalendarDate(fromISO) || !isValidCalendarDate(toISO)) {
    return { ok: false, error: "Rentang tanggal tidak valid" };
  }

  const from = parseLocalDate(fromISO);
  const to = parseLocalDate(toISO);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
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
    classType: s.classType,
    packagePrice: s.packagePrice,
    packageSessions: s.packageSessions,
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
        classType: p.classType,
        rate: p.rate,
        packagePrice: p.packagePrice,
        packageSessions: p.packageSessions,
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

  // MONEY INTEGRITY: a RESCHEDULE session is system-linked to its
  // replacement — flipping it directly would double-count attendance (the
  // replacement session is ALSO billable). A CANCEL session may only be
  // reopened to SCHEDULED; it must not be marked attended/absent directly.
  const currentStatus = access.session.status;
  if (currentStatus === "RESCHEDULE") {
    return {
      ok: false,
      error: "Sesi ini sudah di-reschedule; ubah sesi penggantinya.",
    };
  }
  if (currentStatus === "CANCEL" && status !== "SCHEDULED") {
    return {
      ok: false,
      error: "Sesi dibatalkan; jadwalkan ulang ke SCHEDULED sebelum mengisi absensi.",
    };
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

  if (!isValidCalendarDate(newDateISO) || !isValidClockTime(newStartTime)) {
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
    select: { teacherId: true, studentId: true, startTime: true, durationMinutes: true, classType: true },
  });

  const candidate: Slot = {
    teacherId: original.teacherId,
    studentId: original.studentId,
    startTime: newStartTime,
    durationMinutes: original.durationMinutes,
    classType: original.classType,
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
        classType: original.classType,
        rate: original.rate,
        packagePrice: original.packagePrice,
        packageSessions: original.packageSessions,
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

export type AdHocSessionInput = {
  teacherId: string;
  studentId: string;
  dateISO: string;
  startTime: string;
  durationMinutes: number | string;
  classType: "PRIVATE" | "GROUP";
  packagePrice: number | string;
  packageSessions: number | string;
};

/**
 * Create a single one-off session directly (no Schedule / no generate step).
 * scheduleId is null; rate is derived from the package (harga / jumlah sesi).
 * Conflict-checked against other sessions on the same date (group-aware).
 */
export async function createAdHocSession(
  input: AdHocSessionInput,
): Promise<SessionActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { teacherId, studentId, dateISO, startTime, classType } = input;
  const durationMinutes = Number(input.durationMinutes);
  const packagePrice = Number(input.packagePrice);
  const packageSessions = Number(input.packageSessions);

  if (!teacherId || !studentId) {
    return { ok: false, error: "Guru dan murid wajib dipilih" };
  }
  if (!isValidCalendarDate(dateISO) || !isValidClockTime(startTime)) {
    return { ok: false, error: "Tanggal atau jam tidak valid" };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, error: "Durasi tidak valid" };
  }
  if (!Number.isFinite(packagePrice) || packagePrice < 1) {
    return { ok: false, error: "Harga paket tidak valid" };
  }
  if (!Number.isFinite(packageSessions) || packageSessions < 1) {
    return { ok: false, error: "Jumlah sesi per paket tidak valid" };
  }
  if (classType !== "PRIVATE" && classType !== "GROUP") {
    return { ok: false, error: "Tipe kelas tidak valid" };
  }

  const date = toDbDate(dateISO);
  const sameDaySessions = await prisma.session.findMany({
    where: { date, status: { notIn: ["CANCEL", "RESCHEDULE"] } },
    select: {
      teacherId: true,
      studentId: true,
      startTime: true,
      durationMinutes: true,
      classType: true,
    },
  });
  const candidate: Slot = {
    teacherId,
    studentId,
    startTime,
    durationMinutes,
    classType,
  };
  if (hasConflict(candidate, sameDaySessions)) {
    return {
      ok: false,
      error: "Sesi bentrok dengan sesi lain (guru atau murid sudah terpakai di jam itu)",
    };
  }

  try {
    await prisma.session.create({
      data: {
        scheduleId: null,
        teacherId,
        studentId,
        date,
        startTime,
        durationMinutes,
        classType,
        packagePrice,
        packageSessions,
        rate: perSessionRate(packagePrice, packageSessions),
        status: "SCHEDULED",
      },
    });
  } catch {
    return { ok: false, error: "Gagal membuat sesi (guru/murid tidak valid)" };
  }

  revalidatePath("/admin/sessions");
  revalidatePath("/guru/sessions");
  return { ok: true };
}

/**
 * Edits an existing session's teacher/student/classType/package/date/time
 * /duration. Reuses the same validation and group-aware conflict check as
 * `createAdHocSession`. Rate is recomputed from the (possibly new)
 * package price/sessions — never trusted from the client directly.
 *
 * MONEY INTEGRITY: refuses to edit a session that's already part of a PAID
 * payroll (checked via `PayrollItem.sessionId`'s unique relation) — that
 * would silently change a figure the teacher has already been paid for.
 */
export async function updateSession(
  sessionId: string,
  input: AdHocSessionInput,
): Promise<SessionActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const existing = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!existing) {
    return { ok: false, error: "Sesi tidak ditemukan" };
  }

  const payrollItem = await prisma.payrollItem.findUnique({
    where: { sessionId },
    include: { payroll: true },
  });
  if (payrollItem && payrollItem.payroll.status === "PAID") {
    return {
      ok: false,
      error: "Sesi ini sudah dibayar (payroll PAID) dan tidak bisa diedit",
    };
  }

  const { teacherId, studentId, dateISO, startTime, classType } = input;
  const durationMinutes = Number(input.durationMinutes);
  const packagePrice = Number(input.packagePrice);
  const packageSessions = Number(input.packageSessions);

  if (!teacherId || !studentId) {
    return { ok: false, error: "Guru dan murid wajib dipilih" };
  }
  if (!isValidCalendarDate(dateISO) || !isValidClockTime(startTime)) {
    return { ok: false, error: "Tanggal atau jam tidak valid" };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, error: "Durasi tidak valid" };
  }
  if (!Number.isFinite(packagePrice) || packagePrice < 1) {
    return { ok: false, error: "Harga paket tidak valid" };
  }
  if (!Number.isFinite(packageSessions) || packageSessions < 1) {
    return { ok: false, error: "Jumlah sesi per paket tidak valid" };
  }
  if (classType !== "PRIVATE" && classType !== "GROUP") {
    return { ok: false, error: "Tipe kelas tidak valid" };
  }

  const date = toDbDate(dateISO);
  const sameDaySessions = await prisma.session.findMany({
    where: {
      date,
      status: { notIn: ["CANCEL", "RESCHEDULE"] },
      id: { not: sessionId },
    },
    select: {
      teacherId: true,
      studentId: true,
      startTime: true,
      durationMinutes: true,
      classType: true,
    },
  });
  const candidate: Slot = {
    teacherId,
    studentId,
    startTime,
    durationMinutes,
    classType,
  };
  if (hasConflict(candidate, sameDaySessions)) {
    return {
      ok: false,
      error: "Sesi bentrok dengan sesi lain (guru atau murid sudah terpakai di jam itu)",
    };
  }

  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        teacherId,
        studentId,
        date,
        startTime,
        durationMinutes,
        classType,
        packagePrice,
        packageSessions,
        rate: perSessionRate(packagePrice, packageSessions),
      },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Sesi tidak ditemukan" };
    }
    return { ok: false, error: "Gagal memperbarui sesi (guru/murid tidak valid)" };
  }

  revalidatePath("/admin/sessions");
  revalidatePath("/guru/sessions");
  return { ok: true };
}
