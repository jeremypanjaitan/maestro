import type { AttachmentType, SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDbDate, toDbDate } from "@/lib/domain/dbDate";
import { todayISO } from "@/lib/domain/week";
import { SESSION_STATUS_LABELS } from "@/lib/domain/constants";

export type TimelineAttachment = {
  id: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  dataBase64: string;
};

export type TimelineEntry = {
  sessionId: string;
  date: string;
  startTime: string;
  status: SessionStatus;
  statusLabel: string;
  teacherName: string;
  material: string | null;
  target: string | null;
  result: string | null;
  homework: string | null;
  grade: string | null;
  notes: string | null;
  attachments: TimelineAttachment[];
};

export type StudentTimeline = {
  student: { id: string; name: string; instrument: string };
  entries: TimelineEntry[];
};

export type StudentTimelineResult =
  | { ok: true; timeline: StudentTimeline }
  | { ok: false; error: string };

/**
 * Fetches a student's full lesson-progress timeline (sessions + report +
 * attachments), ordered oldest to newest.
 *
 * SECURITY: role/teacherId are re-derived from `auth()` on every call, never
 * trusted from the caller. ADMIN may view any student's timeline. GURU may
 * only view a student they actually teach — i.e. a student for whom at
 * least one Session exists with `teacherId === auth().user.teacherId` — so
 * a guru can't page through `/admin/students/{id}/timeline` (or call this
 * directly) for someone else's student. Everyone else is denied.
 */
export async function getStudentTimeline(studentId: string): Promise<StudentTimelineResult> {
  const authSession = await auth();
  if (!authSession?.user) {
    return { ok: false, error: "Tidak diizinkan" };
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, instrument: true },
  });
  if (!student) {
    return { ok: false, error: "Murid tidak ditemukan" };
  }

  if (authSession.user.role === "GURU") {
    if (!authSession.user.teacherId) {
      return { ok: false, error: "Tidak diizinkan" };
    }
    const taught = await prisma.session.findFirst({
      where: { studentId, teacherId: authSession.user.teacherId },
      select: { id: true },
    });
    if (!taught) {
      return { ok: false, error: "Tidak diizinkan" };
    }
  } else if (authSession.user.role !== "ADMIN") {
    return { ok: false, error: "Tidak diizinkan" };
  }

  const sessions = await prisma.session.findMany({
    where: { studentId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      teacher: { select: { name: true } },
      lessonReport: {
        include: { attachments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  const entries: TimelineEntry[] = sessions.map((session) => ({
    sessionId: session.id,
    date: formatDbDate(session.date),
    startTime: session.startTime,
    status: session.status,
    statusLabel: SESSION_STATUS_LABELS[session.status],
    teacherName: session.teacher.name,
    material: session.lessonReport?.material ?? null,
    target: session.lessonReport?.target ?? null,
    result: session.lessonReport?.result ?? null,
    homework: session.lessonReport?.homework ?? null,
    grade: session.lessonReport?.grade ?? null,
    notes: session.lessonReport?.notes ?? null,
    attachments: (session.lessonReport?.attachments ?? []).map((a) => ({
      id: a.id,
      type: a.type,
      filename: a.filename,
      mimeType: a.mimeType,
      dataBase64: a.dataBase64,
    })),
  }));

  return { ok: true, timeline: { student, entries } };
}

export type TeacherHistoryEntry = {
  sessionId: string;
  date: string;
  startTime: string;
  status: SessionStatus;
  statusLabel: string;
  studentName: string;
  hasReport: boolean;
};

export type GetTeacherHistoryFilters = {
  /** Inclusive lower bound, "YYYY-MM-DD". */
  from?: string;
  /** Inclusive upper bound, "YYYY-MM-DD". Defaults to today when omitted so
   * the "history" view only shows past/today sessions, not future ones. */
  to?: string;
};

/**
 * Fetches a teacher's past teaching sessions (status + student name +
 * whether a lesson report exists), newest first.
 *
 * SECURITY: role/teacherId are re-derived from `auth()` on every call. GURU
 * callers have `teacherId` FORCED to their own `auth().user.teacherId` --
 * any `teacherId` argument they pass is ignored, so a guru can never see
 * another teacher's history. ADMIN may pass a `teacherId` to scope the
 * query to one teacher; omitting it returns history across all teachers.
 * Everyone else gets an empty list (fail closed).
 */
export async function getTeacherHistory(
  teacherId?: string,
  filters: GetTeacherHistoryFilters = {},
): Promise<TeacherHistoryEntry[]> {
  const authSession = await auth();
  if (!authSession?.user) {
    return [];
  }

  let effectiveTeacherId: string | undefined;

  if (authSession.user.role === "GURU") {
    if (!authSession.user.teacherId) {
      return [];
    }
    effectiveTeacherId = authSession.user.teacherId;
  } else if (authSession.user.role === "ADMIN") {
    effectiveTeacherId = teacherId;
  } else {
    return [];
  }

  const to = filters.to ?? todayISO();

  const sessions = await prisma.session.findMany({
    where: {
      ...(effectiveTeacherId ? { teacherId: effectiveTeacherId } : {}),
      date: {
        ...(filters.from ? { gte: toDbDate(filters.from) } : {}),
        lte: toDbDate(to),
      },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    include: {
      student: { select: { name: true } },
      lessonReport: { select: { id: true } },
    },
  });

  return sessions.map((session) => ({
    sessionId: session.id,
    date: formatDbDate(session.date),
    startTime: session.startTime,
    status: session.status,
    statusLabel: SESSION_STATUS_LABELS[session.status],
    studentName: session.student.name,
    hasReport: session.lessonReport !== null,
  }));
}
