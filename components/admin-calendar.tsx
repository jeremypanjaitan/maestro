"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScheduleCalendar, type CalendarSession } from "@/components/schedule-calendar";
import { AddSessionDialog } from "@/components/add-session-dialog";
import { EditSessionDialog } from "@/components/edit-session-dialog";
import type { SessionRecord } from "@/components/sessions-table";
import { toDbDate } from "@/lib/domain/dbDate";

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
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SessionRecord | null>(null);

  // The edit dialog reuses `SessionRecord` (from the sessions table). A
  // calendar session carries the same fields except `date`, which the
  // calendar exposes as a "YYYY-MM-DD" string — convert it back to the
  // `@db.Date` Date the dialog expects.
  function openEdit(session: CalendarSession) {
    setEditTarget({ ...session, date: toDbDate(session.date) });
    setEditOpen(true);
  }

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
        onEditSession={openEdit}
      />

      <AddSessionDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={date}
        teachers={teachers}
        students={students}
      />

      <EditSessionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        session={editTarget}
        teachers={teachers}
        students={students}
      />
    </div>
  );
}
