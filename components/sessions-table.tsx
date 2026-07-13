"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClassType, SessionStatus } from "@prisma/client";
import { FileText, MoreHorizontal, Pencil } from "lucide-react";

import { DAY_LABELS } from "@/lib/validations/schedule";
import { SESSION_STATUS_LABELS } from "@/lib/domain/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClassTypeBadge } from "@/components/status-badge";
import { AttendanceControls } from "@/components/attendance-controls";
import { EditSessionDialog } from "@/components/edit-session-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SessionTeacherOption = { id: string; name: string };

export type SessionRecord = {
  id: string;
  date: Date;
  startTime: string;
  durationMinutes: number;
  status: SessionStatus;
  instrument: string;
  classType: ClassType;
  rate: number;
  packagePrice: number;
  packageSessions: number;
  teacher: { id: string; name: string };
  student: { id: string; name: string };
};

type SessionsTableProps = {
  sessions: SessionRecord[];
  teachers: SessionTeacherOption[];
  students: { id: string; name: string }[];
  /** Active date range (YYYY-MM-DD) that the server used for this query.
   * The Dari/Sampai inputs drive it via the URL so any month is reachable. */
  initialFrom: string;
  initialTo: string;
};

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SessionsTable({
  sessions,
  teachers,
  students,
  initialFrom,
  initialTo,
}: SessionsTableProps) {
  const router = useRouter();
  // Multi-select filters: empty array = no filter (show all).
  const [teacherFilter, setTeacherFilter] = useState<string[]>([]);
  const [studentFilter, setStudentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  // Date range is server-driven (via the URL) so ANY month is reachable, not
  // just the sessions already loaded. Teacher/status stay client-side.
  const [fromFilter, setFromFilter] = useState<string>(initialFrom);
  const [toFilter, setToFilter] = useState<string>(initialTo);
  const [editTarget, setEditTarget] = useState<SessionRecord | null>(null);

  function applyRange(from: string, to: string) {
    router.push(`/admin/sessions?from=${from}&to=${to}`);
  }

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (teacherFilter.length > 0 && !teacherFilter.includes(session.teacher.id)) return false;
      if (studentFilter.length > 0 && !studentFilter.includes(session.student.id)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(session.status)) return false;
      return true;
    });
  }, [sessions, teacherFilter, studentFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Guru</span>
          <MultiSelectFilter
            allLabel="Semua guru"
            selected={teacherFilter}
            onChange={setTeacherFilter}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Murid</span>
          <MultiSelectFilter
            allLabel="Semua murid"
            selected={studentFilter}
            onChange={setStudentFilter}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
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
                  <TableHead>Hari</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Guru</TableHead>
                  <TableHead>Murid</TableHead>
                  <TableHead>Instrumen</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Belum ada sesi untuk filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{formatDate(session.date)}</TableCell>
                      <TableCell>{DAY_LABELS[session.date.getUTCDay()]}</TableCell>
                      <TableCell>{session.startTime}</TableCell>
                      <TableCell className="font-medium">{session.teacher.name}</TableCell>
                      <TableCell>{session.student.name}</TableCell>
                      <TableCell>{session.instrument}</TableCell>
                      <TableCell>
                        <ClassTypeBadge classType={session.classType} />
                      </TableCell>
                      <TableCell>
                        <AttendanceControls
                          sessionId={session.id}
                          status={session.status}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                              <span className="sr-only">Aksi</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/sessions/${session.id}/report`}>
                                <FileText />
                                Lihat Laporan
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditTarget(session)}>
                              <Pencil />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditSessionDialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        session={editTarget}
        teachers={teachers}
        students={students}
      />
    </div>
  );
}
