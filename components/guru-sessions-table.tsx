"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { CalendarSession } from "@/lib/queries/calendar";
import { SESSION_STATUS_LABELS } from "@/lib/domain/constants";
import { AttendanceControls } from "@/components/attendance-controls";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { RescheduleDialog } from "@/components/reschedule-dialog";
import { ClassTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * The guru "Sesi & Absensi" table with its filter bar — the guru-side
 * counterpart of `SessionsTable` (no Guru filter: a guru only ever sees their
 * own sessions).
 *
 * Murid/Status filter client-side over the loaded rows; the date range is
 * server-driven via the URL (`?from=&to=`) so ANY period is reachable, not
 * just the default window already loaded.
 */
export function GuruSessionsTable({
  sessions,
  initialFrom,
  initialTo,
}: {
  sessions: CalendarSession[];
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  // Empty array = no filter (show all).
  const [studentFilter, setStudentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [fromFilter, setFromFilter] = useState<string>(initialFrom);
  const [toFilter, setToFilter] = useState<string>(initialTo);

  function applyRange(from: string, to: string) {
    router.push(`/guru/sessions?from=${from}&to=${to}`);
  }

  // Distinct students among the loaded sessions, so every visible row stays
  // filterable (including students no longer ACTIVE).
  const studentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of sessions) {
      if (!seen.has(s.student.id)) seen.set(s.student.id, s.student.name);
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [sessions]);

  const filtered = useMemo(
    () =>
      sessions.filter((session) => {
        if (studentFilter.length > 0 && !studentFilter.includes(session.student.id)) {
          return false;
        }
        if (statusFilter.length > 0 && !statusFilter.includes(session.status)) {
          return false;
        }
        return true;
      }),
    [sessions, studentFilter, statusFilter],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Murid</span>
          <MultiSelectFilter
            allLabel="Semua murid"
            selected={studentFilter}
            onChange={setStudentFilter}
            options={studentOptions}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <MultiSelectFilter
            allLabel="Semua status"
            selected={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(SESSION_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Dari</span>
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => {
              setFromFilter(e.target.value);
              if (e.target.value) applyRange(e.target.value, toFilter);
            }}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Sampai</span>
          <input
            type="date"
            value={toFilter}
            onChange={(e) => {
              setToFilter(e.target.value);
              if (e.target.value) applyRange(fromFilter, e.target.value);
            }}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Murid</TableHead>
                  <TableHead>Instrumen</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {sessions.length === 0
                        ? "Belum ada sesi pada rentang ini."
                        : "Tidak ada sesi yang cocok dengan filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((session) => {
                    const locked =
                      session.status === "RESCHEDULE" || session.status === "CANCEL";
                    return (
                      <TableRow key={session.id}>
                        <TableCell>{session.date}</TableCell>
                        <TableCell>{session.startTime}</TableCell>
                        <TableCell className="font-medium">{session.student.name}</TableCell>
                        <TableCell>{session.instrument}</TableCell>
                        <TableCell>
                          <ClassTypeBadge classType={session.classType} />
                        </TableCell>
                        <TableCell>
                          <AttendanceControls sessionId={session.id} status={session.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/guru/sessions/${session.id}/report`}>Laporan</Link>
                            </Button>
                            <RescheduleDialog
                              sessionId={session.id}
                              currentDate={session.date}
                              currentStartTime={session.startTime}
                              disabled={locked}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
