import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getHonorPayment } from "@/lib/queries/honor";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { SessionStatusBadge } from "@/components/status-badge";
import { ProofGallery } from "@/components/honor/proof-gallery";
import { DeletePaymentButton } from "@/components/honor/delete-payment-button";
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

export default async function HonorPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getHonorPayment(id);
  if (!payment) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pembayaran — ${payment.teacherName}`}
        description={`Dibayar ${payment.paidAtStr} · ${payment.items.length} sesi`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/honor">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
        <DeletePaymentButton paymentId={payment.id} />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Nominal Honor</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatRupiah(payment.amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tanggal Bayar</p>
            <p className="text-xl font-semibold tabular-nums">
              {payment.paidAtStr}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Catatan</p>
            <p className="text-sm">{payment.note ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesi yang Dibayar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Murid</TableHead>
                  <TableHead>Status Sesi</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.items.map((it) => (
                  <TableRow key={it.sessionId}>
                    <TableCell className="tabular-nums">{it.dateStr}</TableCell>
                    <TableCell className="tabular-nums">{it.startTime}</TableCell>
                    <TableCell className="font-medium">{it.studentName}</TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle>Bukti Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <ProofGallery proofs={payment.proofs} />
        </CardContent>
      </Card>
    </div>
  );
}
