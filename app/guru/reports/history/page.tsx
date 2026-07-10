import Link from "next/link";
import type { SessionStatus } from "@prisma/client";

import { getTeacherHistory } from "@/lib/queries/history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_BADGE_VARIANT: Record<SessionStatus, "default" | "outline" | "secondary" | "destructive"> = {
  SCHEDULED: "outline",
  HADIR: "default",
  MURID_TIDAK_HADIR: "secondary",
  GURU_TIDAK_HADIR: "secondary",
  RESCHEDULE: "secondary",
  CANCEL: "destructive",
};

/**
 * Guru's own teaching history: past sessions (through today) with status
 * and a link into each session's report.
 *
 * SECURITY: `getTeacherHistory` forces `teacherId` to `auth().user.teacherId`
 * for GURU callers -- no id is passed from here, so there's no way for this
 * page to accidentally leak another teacher's sessions.
 */
export default async function GuruReportsHistoryPage() {
  const sessions = await getTeacherHistory();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Riwayat Mengajar
      </h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam</TableHead>
              <TableHead>Murid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Laporan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada riwayat mengajar.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.sessionId}>
                  <TableCell>{session.date}</TableCell>
                  <TableCell>{session.startTime}</TableCell>
                  <TableCell className="font-medium">{session.studentName}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[session.status]}>
                      {session.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {session.hasReport ? (
                      <Badge variant="secondary">Ada</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Belum ada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/guru/sessions/${session.sessionId}/report`}>Laporan</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
