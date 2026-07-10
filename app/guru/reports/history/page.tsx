import Link from "next/link";

import { getTeacherHistory } from "@/lib/queries/history";
import { PageHeader } from "@/components/page-header";
import { SessionStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Mengajar"
        description="Semua sesi mengajar Anda hingga hari ini."
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                        <SessionStatusBadge status={session.status} />
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
        </CardContent>
      </Card>
    </div>
  );
}
