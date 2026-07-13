import Link from "next/link";

import { getGuruSessions } from "@/lib/queries/calendar";
import { AttendanceControls } from "@/components/attendance-controls";
import { PageHeader } from "@/components/page-header";
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

export default async function GuruSessionsPage() {
  // Scoping to the signed-in guru's own teacherId happens inside
  // getGuruSessions -> getCalendarSessions, re-derived from auth() there.
  const sessions = await getGuruSessions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesi & Absensi"
        description="Tandai kehadiran dan kelola laporan untuk sesi Anda."
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
                  <TableHead>Instrumen</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada sesi pada rentang ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => {
                    const locked = session.status === "RESCHEDULE" || session.status === "CANCEL";
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
