import { getCalendarSessions } from "@/lib/queries/calendar";
import { addDays, getWeekStart, todayISO } from "@/lib/domain/week";
import { PageHeader } from "@/components/page-header";
import { ScheduleCalendar } from "@/components/schedule-calendar";

type GuruSchedulePageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function GuruSchedulePage({
  searchParams,
}: GuruSchedulePageProps) {
  const params = await searchParams;

  const today = todayISO();
  const currentWeekStart = getWeekStart(today);
  const weekStart = params.week ? getWeekStart(params.week) : currentWeekStart;
  const weekEnd = addDays(weekStart, 6);

  // Guru scoping (teacherId = own session.user.teacherId) is enforced
  // inside getCalendarSessions itself, re-deriving the role from auth().
  const sessions = await getCalendarSessions({ from: weekStart, to: weekEnd });

  function weekHref(newWeekStart: string): string {
    return `/guru/schedule?week=${newWeekStart}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender Saya"
        description="Tampilan mingguan sesi mengajar Anda."
      />

      <ScheduleCalendar
        sessions={sessions}
        viewMode="guru"
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
