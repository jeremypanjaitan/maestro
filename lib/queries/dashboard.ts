import type { PayrollStatus, SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import { todayISO } from "@/lib/domain/week";

export type AdminDashboardSession = {
  id: string;
  startTime: string;
  durationMinutes: number;
  status: SessionStatus;
  teacher: { id: string; name: string };
  student: { id: string; name: string };
};

export type AdminDashboardData = {
  totalActiveStudents: number;
  totalActiveTeachers: number;
  todaySessions: AdminDashboardSession[];
  payrollSummary: {
    periodMonth: number;
    periodYear: number;
    count: number;
    totalAmount: number;
    byStatus: Record<PayrollStatus, number>;
  };
};

export type GuruDashboardSession = {
  id: string;
  startTime: string;
  durationMinutes: number;
  status: SessionStatus;
  student: { id: string; name: string; instrument: string };
};

export type GuruStudentProgress = {
  studentId: string;
  studentName: string;
  instrument: string;
  totalSessions: number;
  hadirSessions: number;
  lastSessionDate: string;
};

export type GuruDashboardData = {
  teacherName: string;
  todaySessions: GuruDashboardSession[];
  periodMonth: number;
  periodYear: number;
  hadirCountThisMonth: number;
  ratePerSession: number;
  estimatedHonor: number;
  distinctStudentCount: number;
  studentProgressSummary: GuruStudentProgress[];
};

/**
 * Aggregates the data behind the admin dashboard: headline counts, today's
 * schedule, and a summary of the current month's payroll runs.
 *
 * Defense-in-depth: `app/admin/layout.tsx` already redirects non-admins away
 * from every `/admin/*` route, but this re-derives the role from `auth()`
 * (never trusting a caller-supplied value) so the query is safe to call from
 * anywhere.
 */
export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Tidak diizinkan");
  }

  const todayDate = toDbDate(todayISO());
  const now = new Date();
  const periodMonth = now.getMonth() + 1;
  const periodYear = now.getFullYear();

  const [totalActiveStudents, totalActiveTeachers, todaySessionsRaw, payrolls] =
    await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.teacher.count({ where: { status: "ACTIVE" } }),
      prisma.session.findMany({
        where: { date: todayDate },
        orderBy: { startTime: "asc" },
        include: {
          teacher: { select: { id: true, name: true } },
          student: { select: { id: true, name: true } },
        },
      }),
      prisma.payroll.findMany({
        where: { periodMonth, periodYear },
        include: { teacher: { select: { id: true, name: true } } },
      }),
    ]);

  const todaySessions: AdminDashboardSession[] = todaySessionsRaw.map((s) => ({
    id: s.id,
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    status: s.status,
    teacher: s.teacher,
    student: s.student,
  }));

  const byStatus: Record<PayrollStatus, number> = {
    DRAFT: 0,
    APPROVED: 0,
    PAID: 0,
  };
  let totalAmount = 0;
  for (const p of payrolls) {
    byStatus[p.status] += 1;
    totalAmount += p.total;
  }

  return {
    totalActiveStudents,
    totalActiveTeachers,
    todaySessions,
    payrollSummary: {
      periodMonth,
      periodYear,
      count: payrolls.length,
      totalAmount,
      byStatus,
    },
  };
}

/**
 * Aggregates the data behind a teacher's own dashboard: today's schedule,
 * this month's estimated honor, and a short per-student progress summary.
 *
 * SECURITY: the `teacherId` is derived exclusively from the authenticated
 * session (`auth()`), never accepted as a parameter — a guru must only ever
 * see their own sessions/students/honor. Fails closed (throws) if the
 * session isn't a GURU with a linked teacher record.
 */
export async function getGuruDashboard(): Promise<GuruDashboardData> {
  const session = await auth();
  const teacherId = session?.user?.role === "GURU" ? session.user.teacherId : null;
  if (!teacherId) {
    throw new Error("Tidak diizinkan");
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { name: true, ratePerSession: true },
  });
  if (!teacher) {
    throw new Error("Data guru tidak ditemukan");
  }

  const todayDate = toDbDate(todayISO());
  const now = new Date();
  const periodMonth = now.getMonth() + 1;
  const periodYear = now.getFullYear();
  const periodStart = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
  const periodEnd = new Date(Date.UTC(periodYear, periodMonth, 0));

  const [todaySessionsRaw, monthSessions] = await Promise.all([
    prisma.session.findMany({
      where: { teacherId, date: todayDate },
      orderBy: { startTime: "asc" },
      include: {
        student: { select: { id: true, name: true, instrument: true } },
      },
    }),
    prisma.session.findMany({
      where: { teacherId, date: { gte: periodStart, lte: periodEnd } },
      orderBy: { date: "desc" },
      include: {
        student: { select: { id: true, name: true, instrument: true } },
      },
    }),
  ]);

  const todaySessions: GuruDashboardSession[] = todaySessionsRaw.map((s) => ({
    id: s.id,
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    status: s.status,
    student: s.student,
  }));

  const hadirSessionsThisMonth = monthSessions.filter((s) => s.status === "HADIR");
  const hadirCountThisMonth = hadirSessionsThisMonth.length;
  // Sum of each HADIR session's own rate snapshot (classType + rate can vary
  // per enrollment), not count * a single teacher-wide rate.
  const estimatedHonor = hadirSessionsThisMonth.reduce((sum, s) => sum + s.rate, 0);

  const progressMap = new Map<string, GuruStudentProgress>();
  for (const s of monthSessions) {
    const existing = progressMap.get(s.studentId);
    if (existing) {
      existing.totalSessions += 1;
      if (s.status === "HADIR") existing.hadirSessions += 1;
      if (formatDbDate(s.date) > existing.lastSessionDate) {
        existing.lastSessionDate = formatDbDate(s.date);
      }
    } else {
      progressMap.set(s.studentId, {
        studentId: s.studentId,
        studentName: s.student.name,
        instrument: s.student.instrument,
        totalSessions: 1,
        hadirSessions: s.status === "HADIR" ? 1 : 0,
        lastSessionDate: formatDbDate(s.date),
      });
    }
  }
  const studentProgressSummary = Array.from(progressMap.values()).sort((a, b) =>
    b.lastSessionDate.localeCompare(a.lastSessionDate),
  );

  return {
    teacherName: teacher.name,
    todaySessions,
    periodMonth,
    periodYear,
    hadirCountThisMonth,
    ratePerSession: teacher.ratePerSession,
    estimatedHonor,
    distinctStudentCount: progressMap.size,
    studentProgressSummary,
  };
}
