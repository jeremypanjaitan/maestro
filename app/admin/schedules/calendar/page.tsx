import { prisma } from "@/lib/prisma";
import { getCalendarSessions } from "@/lib/queries/calendar";
import { addDays, getWeekStart, todayISO } from "@/lib/domain/week";
import { PageHeader } from "@/components/page-header";
import { AdminCalendar } from "@/components/admin-calendar";
import { CalendarFilters } from "@/components/calendar-filters";

type AdminCalendarPageProps = {
  searchParams: Promise<{
    week?: string;
    teacherId?: string;
    studentId?: string;
  }>;
};

export default async function AdminScheduleCalendarPage({
  searchParams,
}: AdminCalendarPageProps) {
  const params = await searchParams;

  const today = todayISO();
  const currentWeekStart = getWeekStart(today);
  const weekStart = params.week ? getWeekStart(params.week) : currentWeekStart;
  const weekEnd = addDays(weekStart, 6);

  const teacherId = params.teacherId || undefined;
  const studentId = params.studentId || undefined;

  const [sessions, teachers, students] = await Promise.all([
    getCalendarSessions({ from: weekStart, to: weekEnd, teacherId, studentId }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  function weekHref(newWeekStart: string): string {
    const search = new URLSearchParams();
    search.set("week", newWeekStart);
    if (teacherId) search.set("teacherId", teacherId);
    if (studentId) search.set("studentId", studentId);
    return `/admin/schedules/calendar?${search.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender Jadwal"
        description="Tampilan mingguan seluruh sesi terjadwal, dapat difilter per guru/murid."
      />

      <CalendarFilters
        teachers={teachers}
        students={students}
        teacherId={teacherId}
        studentId={studentId}
      />

      <AdminCalendar
        sessions={sessions}
        teachers={teachers}
        students={students}
        weekStart={weekStart}
        weekEnd={weekEnd}
        prevWeekHref={weekHref(addDays(weekStart, -7))}
        nextWeekHref={weekHref(addDays(weekStart, 7))}
        currentWeekHref={weekHref(currentWeekStart)}
        isCurrentWeek={weekStart === currentWeekStart}
      />
    </div>
  );
}
