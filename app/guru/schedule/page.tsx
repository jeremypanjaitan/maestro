import { getCalendarSessions } from "@/lib/queries/calendar";
import { addDays, getWeekStart, todayISO } from "@/lib/domain/week";
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Jadwal Saya
      </h1>

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
