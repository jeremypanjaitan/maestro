import type { ClassType, SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import { addDays, todayISO } from "@/lib/domain/week";

export type CalendarSession = {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: SessionStatus;
  instrument: string;
  classType: ClassType;
  rate: number;
  teacher: { id: string; name: string };
  student: { id: string; name: string };
};

export type GetCalendarSessionsParams = {
  /** Inclusive range start, "YYYY-MM-DD". */
  from: string;
  /** Inclusive range end, "YYYY-MM-DD". */
  to: string;
  /** Admin-only filter; ignored (forced to the caller's own teacherId) for GURU. */
  teacherId?: string;
  /** Admin-only filter; ignored for GURU. */
  studentId?: string;
  /** Chronological direction of the result. Defaults to "asc" — the calendar
   * view groups by start time and needs oldest-first. List screens that read
   * as a history (e.g. guru "Sesi & Absensi") pass "desc". */
  order?: "asc" | "desc";
};

/**
 * Fetches sessions within [from, to] (inclusive) for the calendar view.
 *
 * SECURITY: role is re-derived from `auth()` on every call, never trusted
 * from the caller. When the requester is GURU, `teacherId` is forced to
 * `session.user.teacherId` and any passed `teacherId`/`studentId` filters
 * are ignored — a guru must only ever see their own sessions. ADMIN may
 * optionally filter by teacherId and/or studentId.
 */
export async function getCalendarSessions({
  from,
  to,
  teacherId,
  studentId,
  order = "asc",
}: GetCalendarSessionsParams): Promise<CalendarSession[]> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Tidak diizinkan");
  }

  const where: {
    date: { gte: Date; lte: Date };
    teacherId?: string;
    studentId?: string;
  } = {
    date: { gte: toDbDate(from), lte: toDbDate(to) },
  };

  if (session.user.role === "GURU") {
    if (!session.user.teacherId) {
      // Guru account not linked to a Teacher record: no sessions to show.
      return [];
    }
    where.teacherId = session.user.teacherId;
  } else if (session.user.role === "ADMIN") {
    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;
  } else {
    // Unknown/unsupported role: fail closed.
    return [];
  }

  const sessions = await prisma.session.findMany({
    where,
    orderBy: [{ date: order }, { startTime: order }],
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true, instrument: true } },
      schedule: { select: { instrument: true } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    date: formatDbDate(s.date),
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    status: s.status,
    instrument: s.schedule?.instrument ?? s.student.instrument,
    classType: s.classType,
    rate: s.rate,
    teacher: { id: s.teacher.id, name: s.teacher.name },
    student: { id: s.student.id, name: s.student.name },
  }));
}

/** Default window for the "Sesi & Absensi" screen: the last 14 days (so a
 * guru can still mark attendance for recently-past sessions) through the next
 * 30 days. Exported so the page can seed its Dari/Sampai inputs with the same
 * range the query defaults to. */
export function guruSessionsDefaultRange(): { from: string; to: string } {
  const today = todayISO();
  return { from: addDays(today, -14), to: addDays(today, 30) };
}

/**
 * Sessions for the "Sesi & Absensi" screen, within [from, to] (inclusive) —
 * defaults to `guruSessionsDefaultRange()` when the caller passes no range.
 * Ordered newest -> oldest: this screen reads as a session history, unlike
 * the calendar view which needs oldest-first. Scoping to the caller's own
 * teacherId happens inside `getCalendarSessions`; this is just a convenience
 * wrapper over the date window this screen needs.
 */
export async function getGuruSessions(range?: {
  from: string;
  to: string;
}): Promise<CalendarSession[]> {
  const { from, to } = range ?? guruSessionsDefaultRange();
  return getCalendarSessions({ from, to, order: "desc" });
}

/**
 * The signed-in guru's own students: those linked to them via a schedule or a
 * prior session. Used to populate the guru "Tambah Sesi" dialog. teacherId is
 * re-derived from `auth()`, never trusted from the caller. Returns an empty
 * list for non-guru callers or a guru not linked to a Teacher record.
 *
 * NOTE: this is the read-side mirror of the ownership check enforced by
 * `createGuruSession` — keep the "schedule OR session" link rule in sync.
 */
export async function getStudentsForGuru(): Promise<{ id: string; name: string }[]> {
  const session = await auth();
  const teacherId = session?.user?.teacherId;
  if (session?.user?.role !== "GURU" || !teacherId) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { schedules: { some: { teacherId } } },
        { sessions: { some: { teacherId } } },
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return students;
}
