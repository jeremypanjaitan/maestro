import Link from "next/link";

import { getAdminStudentPaymentData } from "@/lib/queries/student-payment";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StudentPaymentStudentSelect } from "@/components/student-payment/student-select";
import { CreateStudentPaymentDialog } from "@/components/student-payment/create-student-payment-dialog";
import { DownloadKwitansiButton } from "@/components/student-payment/download-kwitansi-button";
import { DeleteStudentPaymentButton } from "@/components/student-payment/delete-student-payment-button";
import { MoveCreditDialog } from "@/components/student-payment/move-credit-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminStudentPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const data = await getAdminStudentPaymentData(studentId);

  const selectedStudent = data.students.find((s) => s.id === data.selectedStudentId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran Murid"
        description="Catat pembayaran les per pertemuan (di akhir atau di awal) dan unduh kwitansinya."
      >
        <StudentPaymentStudentSelect
          students={data.students}
          value={data.selectedStudentId}
        />
        {selectedStudent && (
          <CreateStudentPaymentDialog
            studentId={selectedStudent.id}
            studentName={selectedStudent.name}
            studentInstrument={selectedStudent.instrument}
            sessions={data.unpaidSessions}
          />
        )}
      </PageHeader>

      {!selectedStudent ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Pilih murid untuk melihat riwayat pembayaran dan membuat kwitansi.
          </CardContent>
        </Card>
      ) : (
        <>
          {data.credits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Kredit</CardTitle>
                <CardDescription>
                  Pertemuan yang sudah dibayar tetapi sesinya dibatalkan.
                  Pindahkan ke sesi lain agar kwitansinya tetap benar.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sesi Dibatalkan</TableHead>
                        <TableHead>Guru</TableHead>
                        <TableHead>Kwitansi</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.credits.map((c) => (
                        <TableRow key={c.itemId}>
                          <TableCell className="tabular-nums">
                            {c.dateStr} {c.startTime}
                          </TableCell>
                          <TableCell>{c.teacherName}</TableCell>
                          <TableCell className="tabular-nums">{c.paymentNumber}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.rateSnapshot > 0 ? formatRupiah(c.rateSnapshot) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <MoveCreditDialog credit={c} sessions={data.unpaidSessions} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pembayaran — {selectedStudent.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Kwitansi</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-center">Pertemuan</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Belum ada pembayaran.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium tabular-nums">{p.number}</TableCell>
                          <TableCell className="tabular-nums">{p.paidAtStr}</TableCell>
                          <TableCell className="text-center tabular-nums">
                            {p.itemCount}
                            {p.creditCount > 0 && (
                              <span className="text-xs text-amber-600"> ({p.creditCount} kredit)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatRupiah(p.amount)}
                          </TableCell>
                          <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                            {p.description ?? p.note ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/admin/student-payments/${p.id}`}>Detail</Link>
                              </Button>
                              <DownloadKwitansiButton paymentId={p.id} />
                              <DeleteStudentPaymentButton paymentId={p.id} iconOnly />
                            </div>
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
