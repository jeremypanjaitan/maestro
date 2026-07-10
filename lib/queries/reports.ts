import type { PayrollStatus, Prisma, SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import { SESSION_STATUS_LABELS, PAYROLL_STATUS_LABELS } from "@/lib/domain/constants";
import { formatPeriod } from "@/lib/utils";

/**
 * Shared filter shape for every recap query below. Dates are inclusive
 * "YYYY-MM-DD" bounds; `teacherId`/`studentId` narrow to a single
 * teacher/student when present. All fields are optional — an empty filter
 * object returns the recap across all data.
 */
export type ReportFilters = {
  from?: string;
  to?: string;
  teacherId?: string;
  studentId?: string;
};

/**
 * Re-derives the caller's role from `auth()` and throws unless they're an
 * ADMIN. Every query in this module calls this first — never trust a
 * caller-supplied role/id, always re-check the session server-side. This is
 * defense-in-depth on top of `app/admin/layout.tsx` (which already redirects
 * non-admins) and the export route's own auth check.
 */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Tidak diizinkan");
  }
}

function buildSessionWhere(filters: ReportFilters): Prisma.SessionWhereInput {
  const date: Prisma.DateTimeFilter = {};
  if (filters.from) date.gte = toDbDate(filters.from);
  if (filters.to) date.lte = toDbDate(filters.to);

  return {
    ...(Object.keys(date).length ? { date } : {}),
    ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
    ...(filters.studentId ? { studentId: filters.studentId } : {}),
  };
}

const EMPTY_STATUS_COUNTS: Record<SessionStatus, number> = {
  SCHEDULED: 0,
  HADIR: 0,
  MURID_TIDAK_HADIR: 0,
  GURU_TIDAK_HADIR: 0,
  RESCHEDULE: 0,
  CANCEL: 0,
};

export type AttendanceDetailRow = {
  date: string;
  teacherName: string;
  studentName: string;
  status: SessionStatus;
  statusLabel: string;
};

export type AttendanceRecap = {
  counts: Record<SessionStatus, number>;
  total: number;
  details: AttendanceDetailRow[];
};

/**
 * Attendance recap: every session in the filtered range, grouped/counted by
 * status, plus a flat detail list (date, teacher, student, status).
 */
export async function getAttendanceRecap(filters: ReportFilters = {}): Promise<AttendanceRecap> {
  await requireAdmin();

  const sessions = await prisma.session.findMany({
    where: buildSessionWhere(filters),
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      teacher: { select: { name: true } },
      student: { select: { name: true } },
    },
  });

  const counts: Record<SessionStatus, number> = { ...EMPTY_STATUS_COUNTS };
  const details: AttendanceDetailRow[] = sessions.map((session) => {
    counts[session.status] += 1;
    return {
      date: formatDbDate(session.date),
      teacherName: session.teacher.name,
      studentName: session.student.name,
      status: session.status,
      statusLabel: SESSION_STATUS_LABELS[session.status],
    };
  });

  return { counts, total: sessions.length, details };
}

export type TeachingHoursRow = {
  teacherId: string;
  teacherName: string;
  totalSessions: number;
  hadirSessions: number;
  totalMinutes: number;
  totalHours: number;
};

export type TeachingHoursRecap = {
  rows: TeachingHoursRow[];
  grandTotalSessions: number;
  grandTotalHadir: number;
  grandTotalMinutes: number;
};

/**
 * Teaching hours recap: per teacher, total sessions in range, how many were
 * HADIR, and the summed duration (minutes/hours) of the HADIR ones.
 */
export async function getTeachingHoursRecap(
  filters: ReportFilters = {},
): Promise<TeachingHoursRecap> {
  await requireAdmin();

  const sessions = await prisma.session.findMany({
    where: buildSessionWhere(filters),
    include: { teacher: { select: { id: true, name: true } } },
  });

  const byTeacher = new Map<string, TeachingHoursRow>();
  for (const session of sessions) {
    let row = byTeacher.get(session.teacherId);
    if (!row) {
      row = {
        teacherId: session.teacherId,
        teacherName: session.teacher.name,
        totalSessions: 0,
        hadirSessions: 0,
        totalMinutes: 0,
        totalHours: 0,
      };
      byTeacher.set(session.teacherId, row);
    }
    row.totalSessions += 1;
    if (session.status === "HADIR") {
      row.hadirSessions += 1;
      row.totalMinutes += session.durationMinutes;
    }
  }

  const rows = Array.from(byTeacher.values())
    .map((row) => ({ ...row, totalHours: Math.round((row.totalMinutes / 60) * 100) / 100 }))
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName));

  return {
    rows,
    grandTotalSessions: rows.reduce((sum, row) => sum + row.totalSessions, 0),
    grandTotalHadir: rows.reduce((sum, row) => sum + row.hadirSessions, 0),
    grandTotalMinutes: rows.reduce((sum, row) => sum + row.totalMinutes, 0),
  };
}

export type StudentProgressRow = {
  studentId: string;
  studentName: string;
  totalSessions: number;
  hadirSessions: number;
  reportCount: number;
  latestReportDate: string | null;
  latestGrade: string | null;
};

export type StudentProgressRecap = {
  rows: StudentProgressRow[];
};

/**
 * Student progress recap: per student, session/HADIR counts, how many have
 * a lesson report, and the date + grade of the most recent report.
 */
export async function getStudentProgressRecap(
  filters: ReportFilters = {},
): Promise<StudentProgressRecap> {
  await requireAdmin();

  const sessions = await prisma.session.findMany({
    where: buildSessionWhere(filters),
    orderBy: [{ date: "asc" }],
    include: {
      student: { select: { id: true, name: true } },
      lessonReport: { select: { grade: true } },
    },
  });

  const byStudent = new Map<string, StudentProgressRow>();
  for (const session of sessions) {
    let row = byStudent.get(session.studentId);
    if (!row) {
      row = {
        studentId: session.studentId,
        studentName: session.student.name,
        totalSessions: 0,
        hadirSessions: 0,
        reportCount: 0,
        latestReportDate: null,
        latestGrade: null,
      };
      byStudent.set(session.studentId, row);
    }
    row.totalSessions += 1;
    if (session.status === "HADIR") row.hadirSessions += 1;
    if (session.lessonReport) {
      row.reportCount += 1;
      const dateStr = formatDbDate(session.date);
      if (!row.latestReportDate || dateStr >= row.latestReportDate) {
        row.latestReportDate = dateStr;
        row.latestGrade = session.lessonReport.grade;
      }
    }
  }

  const rows = Array.from(byStudent.values()).sort((a, b) =>
    a.studentName.localeCompare(b.studentName),
  );

  return { rows };
}

export type PayrollRecapRow = {
  payrollId: string;
  teacherName: string;
  period: string;
  status: PayrollStatus;
  statusLabel: string;
  total: number;
};

export type PayrollRecap = {
  rows: PayrollRecapRow[];
  grandTotal: number;
};

/**
 * Payroll recap: payrolls generated within the filtered range (by
 * `generatedAt`, inclusive of the whole `to` day), optionally narrowed to a
 * single teacher, plus a grand total.
 */
export async function getPayrollRecap(filters: ReportFilters = {}): Promise<PayrollRecap> {
  await requireAdmin();

  const generatedAt: Prisma.DateTimeFilter = {};
  if (filters.from) generatedAt.gte = toDbDate(filters.from);
  if (filters.to) {
    // Inclusive upper bound: push to just before the next UTC midnight so
    // the whole `to` day's payrolls (any time-of-day) are included.
    generatedAt.lte = new Date(toDbDate(filters.to).getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  const payrolls = await prisma.payroll.findMany({
    where: {
      ...(Object.keys(generatedAt).length ? { generatedAt } : {}),
      ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    include: { teacher: { select: { name: true } } },
  });

  const rows: PayrollRecapRow[] = payrolls.map((payroll) => ({
    payrollId: payroll.id,
    teacherName: payroll.teacher.name,
    period: formatPeriod(payroll.periodMonth, payroll.periodYear),
    status: payroll.status,
    statusLabel: PAYROLL_STATUS_LABELS[payroll.status],
    total: payroll.total,
  }));

  return { rows, grandTotal: rows.reduce((sum, row) => sum + row.total, 0) };
}
