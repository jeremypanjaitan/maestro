import Link from "next/link";

import { getAdminHonorData } from "@/lib/queries/honor";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ClassTypeBadge, SessionStatusBadge, StatusBadge } from "@/components/status-badge";
import { HonorTeacherSelect } from "@/components/honor/honor-teacher-select";
import { HonorPaymentsTable } from "@/components/honor/honor-payments-table";
import {
  CreateHonorPaymentDialog,
  type SelectableSession,
} from "@/components/honor/create-honor-payment-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminHonorPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const { teacherId } = await searchParams;
  const data = await getAdminHonorData(teacherId);

  const selectedTeacher = data.teachers.find(
    (t) => t.id === data.selectedTeacherId,
  );

  const unpaidSessions: SelectableSession[] = data.sessions
    .filter((s) => !s.paid)
    .map((s) => ({
      id: s.id,
      dateStr: s.dateStr,
      startTime: s.startTime,
      studentName: s.studentName,
      status: s.status,
      rate: s.rate,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran Honor"
        description="Bayar honor guru per sesi, pilih sesi yang dibayar, dan unggah bukti transfer."
      >
        <HonorTeacherSelect
          teachers={data.teachers}
          value={data.selectedTeacherId}
        />
        {selectedTeacher && (
          <CreateHonorPaymentDialog
            teacherId={selectedTeacher.id}
            teacherName={selectedTeacher.name}
            sessions={unpaidSessions}
          />
        )}
      </PageHeader>

      {!selectedTeacher ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Pilih guru untuk melihat status sesi dan riwayat pembayaran honor.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pembayaran — {selectedTeacher.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <HonorPaymentsTable
                payments={data.payments}
                basePath="/admin/honor"
                canDelete
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Status Sesi ({unpaidSessions.length} belum dibayar)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jam</TableHead>
                      <TableHead>Murid</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Status Sesi</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Pembayaran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Belum ada sesi untuk guru ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="tabular-nums">{s.dateStr}</TableCell>
                          <TableCell className="tabular-nums">{s.startTime}</TableCell>
                          <TableCell className="font-medium">{s.studentName}</TableCell>
                          <TableCell>
                            <ClassTypeBadge classType={s.classType} />
                          </TableCell>
                          <TableCell>
                            <SessionStatusBadge status={s.status} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {s.rate > 0 ? formatRupiah(s.rate) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {s.paid && s.paymentId ? (
                              <Link
                                href={`/admin/honor/${s.paymentId}`}
                                className="inline-block"
                              >
                                <StatusBadge label="Sudah dibayar" tone="green" />
                              </Link>
                            ) : (
                              <StatusBadge label="Belum dibayar" tone="amber" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
