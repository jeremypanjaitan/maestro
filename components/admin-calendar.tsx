"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScheduleCalendar, type CalendarSession } from "@/components/schedule-calendar";
import { AddSessionDialog } from "@/components/add-session-dialog";

type Option = { id: string; name: string };

type AdminCalendarProps = {
  sessions: CalendarSession[];
  teachers: Option[];
  students: Option[];
  weekStart: string;
  weekEnd: string;
  prevWeekHref: string;
  nextWeekHref: string;
  currentWeekHref: string;
  isCurrentWeek: boolean;
};

/**
 * Client wrapper around `ScheduleCalendar` for the admin calendar page. Owns
 * the `AddSessionDialog`'s open state + prefilled date so the admin can add
 * a session directly from a "Tambah Sesi" button or the per-day "+" quick-add
 * in the weekly grid — without making the calendar page itself a client
 * component.
 */
export function AdminCalendar({
  sessions,
  teachers,
  students,
  weekStart,
  weekEnd,
  prevWeekHref,
  nextWeekHref,
  currentWeekHref,
  isCurrentWeek,
}: AdminCalendarProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setDate("");
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Tambah Sesi
        </Button>
      </div>

      <ScheduleCalendar
        sessions={sessions}
        viewMode="admin"
        weekStart={weekStart}
        weekEnd={weekEnd}
        prevWeekHref={prevWeekHref}
        nextWeekHref={nextWeekHref}
        currentWeekHref={currentWeekHref}
        isCurrentWeek={isCurrentWeek}
        onAddSession={(d) => {
          setDate(d);
          setOpen(true);
        }}
      />

      <AddSessionDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={date}
        teachers={teachers}
        students={students}
      />
    </div>
  );
}
