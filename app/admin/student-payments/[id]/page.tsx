import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getStudentPayment } from "@/lib/queries/student-payment";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { SessionStatusBadge } from "@/components/status-badge";
import { DownloadKwitansiButton } from "@/components/student-payment/download-kwitansi-button";
import { DeleteStudentPaymentButton } from "@/components/student-payment/delete-student-payment-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function StudentPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getStudentPayment(id);
  if (!payment) notFound();

  const backHref = `/admin/student-payments?studentId=${payment.studentId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${payment.number} — ${payment.studentName}`}
        description={`Dibayar ${payment.paidAtStr} · ${payment.items.length} pertemuan`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
        <DownloadKwitansiButton paymentId={payment.id} label="Unduh Kwitansi" />
        <DeleteStudentPaymentButton paymentId={payment.id} redirectTo={backHref} />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Dibayar</p>
            <p className="text-xl font-semibold tabular-nums">{formatRupiah(payment.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tanggal Bayar</p>
            <p className="text-xl font-semibold tabular-nums">{payment.paidAtStr}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Catatan</p>
            <p className="text-sm">{payment.note ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pertemuan yang Dibayar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pertemuan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Guru</TableHead>
                  <TableHead>Status Sesi</TableHead>
                  <TableHead className="text-right">Tarif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.items.map((it) => (
                  <TableRow key={it.sessionId}>
                    <TableCell className="tabular-nums">
                      {it.meetingNumber ? `ke-${it.meetingNumber}` : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {it.dateStr}
                      {it.rescheduledFromDateStr && (
                        <span className="block text-xs text-muted-foreground">
                          pengganti {it.rescheduledFromDateStr}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{it.startTime}</TableCell>
                    <TableCell>{it.teacherName}</TableCell>
                    <TableCell>
                      <SessionStatusBadge status={it.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {it.rateSnapshot > 0 ? formatRupiah(it.rateSnapshot) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
