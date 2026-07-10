"use client";

import Link from "next/link";
import type { SessionStatus } from "@prisma/client";

import { SESSION_STATUS_LABELS } from "@/lib/domain/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CalendarSession = {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: SessionStatus;
  instrument: string;
  teacher: { id: string; name: string };
  student: { id: string; name: string };
};

type ScheduleCalendarProps = {
  sessions: CalendarSession[];
  viewMode: "admin" | "guru";
  /** Monday of the displayed week, "YYYY-MM-DD". */
  weekStart: string;
  /** Sunday of the displayed week, "YYYY-MM-DD". */
  weekEnd: string;
  prevWeekHref: string;
  nextWeekHref: string;
  currentWeekHref: string;
  isCurrentWeek: boolean;
};

const STATUS_BADGE_VARIANT: Record<
  SessionStatus,
  "default" | "outline" | "secondary" | "destructive"
> = {
  SCHEDULED: "outline",
  HADIR: "default",
  MURID_TIDAK_HADIR: "secondary",
  GURU_TIDAK_HADIR: "secondary",
  RESCHEDULE: "secondary",
  CANCEL: "destructive",
};

const DAY_NAMES = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Parses a "YYYY-MM-DD" string into the day-of-month/month for display,
 * without any timezone conversion. */
function parseDateParts(dateStr: string): { day: number; month: number } {
  const [, month, day] = dateStr.split("-").map(Number);
  return { day, month: month - 1 };
}

/** Builds the 7 "YYYY-MM-DD" dates (Mon..Sun) for the week starting at
 * `weekStart`, without going through JS `Date` timezone conversion. */
function buildWeekDates(weekStart: string): string[] {
  const [year, month, day] = weekStart.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });
}

function formatWeekRangeLabel(weekStart: string, weekEnd: string): string {
  const start = parseDateParts(weekStart);
  const end = parseDateParts(weekEnd);
  const startLabel = `${start.day} ${MONTH_NAMES[start.month]}`;
  const endLabel = `${end.day} ${MONTH_NAMES[end.month]}`;
  return `${startLabel} – ${endLabel}`;
}

export function ScheduleCalendar({
  sessions,
  viewMode,
  weekStart,
  weekEnd,
  prevWeekHref,
  nextWeekHref,
  currentWeekHref,
  isCurrentWeek,
}: ScheduleCalendarProps) {
  const weekDates = buildWeekDates(weekStart);

  const sessionsByDate = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const list = sessionsByDate.get(session.date) ?? [];
    list.push(session);
    sessionsByDate.set(session.date, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">
          {formatWeekRangeLabel(weekStart, weekEnd)}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={prevWeekHref}>Minggu Sebelumnya</Link>
          </Button>
          {!isCurrentWeek && (
            <Button asChild variant="outline" size="sm">
              <Link href={currentWeekHref}>Minggu Ini</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={nextWeekHref}>Minggu Berikutnya</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {weekDates.map((date, index) => {
          const daySessions = (sessionsByDate.get(date) ?? []).slice();
          const { day, month } = parseDateParts(date);

          return (
            <div
              key={date}
              className="flex flex-col gap-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {DAY_NAMES[index]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {day} {MONTH_NAMES[month]}
                </span>
              </div>

              {daySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Tidak ada sesi
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {daySessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex flex-col gap-1 rounded-md border border-border bg-card p-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-foreground">
                          {session.startTime}
                        </span>
                        <Badge variant={STATUS_BADGE_VARIANT[session.status]}>
                          {SESSION_STATUS_LABELS[session.status]}
                        </Badge>
                      </div>
                      {viewMode === "admin" ? (
                        <>
                          <span className="text-foreground">
                            {session.student.name}
                          </span>
                          <span className="text-muted-foreground">
                            {session.teacher.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-foreground">
                          {session.student.name}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {session.instrument} &middot; {session.durationMinutes}
                        m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
