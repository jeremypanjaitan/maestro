"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { SessionStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SessionStatusBadge } from "@/components/status-badge";

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
  /** When provided, shows a "+" quick-add button in each day cell header
   * that calls back with that cell's "YYYY-MM-DD" date. Omitted on the guru
   * calendar, which renders read-only. */
  onAddSession?: (date: string) => void;
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
  onAddSession,
}: ScheduleCalendarProps) {
  const weekDates = buildWeekDates(weekStart);
  // Clicking a session opens its read-only report page, per role.
  const reportBasePath = viewMode === "admin" ? "/admin/sessions" : "/guru/sessions";

  const sessionsByDate = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const list = sessionsByDate.get(session.date) ?? [];
    list.push(session);
    sessionsByDate.set(session.date, list);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
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
            // Group sessions that share the same start time so concurrent
            // sessions are shown together (side-by-side, wrapping if narrow)
            // under a single time label. daySessions is already time-sorted.
            const timeGroups: Array<{ time: string; items: CalendarSession[] }> = [];
            for (const s of daySessions) {
              const last = timeGroups[timeGroups.length - 1];
              if (last && last.time === s.startTime) last.items.push(s);
              else timeGroups.push({ time: s.startTime, items: [s] });
            }

            return (
              <div
                key={date}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {DAY_NAMES[index]}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {day} {MONTH_NAMES[month]}
                    </span>
                    {onAddSession ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Tambah sesi ${day} ${MONTH_NAMES[month]}`}
                        onClick={() => onAddSession(date)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {timeGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Tidak ada sesi
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {timeGroups.map((group) => (
                      <div key={group.time} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {group.time}
                          </span>
                          {group.items.length > 1 ? (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {group.items.length} sesi
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((session) => (
                            <Link
                              key={session.id}
                              href={`${reportBasePath}/${session.id}/report`}
                              title="Lihat laporan"
                              className="flex min-w-[7rem] flex-1 basis-32 flex-col gap-1 rounded-md border border-border bg-muted/40 p-2 text-xs transition-colors hover:bg-muted"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-medium text-foreground">
                                  {session.student.name}
                                </span>
                                <SessionStatusBadge status={session.status} />
                              </div>
                              {viewMode === "admin" ? (
                                <span className="text-muted-foreground">
                                  {session.teacher.name}
                                </span>
                              ) : null}
                              <span className="text-muted-foreground">
                                {session.instrument} &middot; {session.durationMinutes}m
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
