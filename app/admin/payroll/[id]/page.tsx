import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { formatPeriod, formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PayrollStatusBadge } from "@/components/status-badge";
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
import { PayrollStatusActions } from "@/components/payroll-table";

type PayrollDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayrollDetailPage({ params }: PayrollDetailPageProps) {
  const { id } = await params;

  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      teacher: { select: { name: true } },
      items: {
        include: {
          session: {
            select: { date: true, startTime: true, student: { select: { name: true } } },
          },
        },
        orderBy: { session: { date: "asc" } },
      },
    },
  });

  if (!payroll) {
    notFound();
  }

  const period = formatPeriod(payroll.periodMonth, payroll.periodYear);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payroll — ${payroll.teacher.name}`}
        description={`Periode ${period} · ${payroll.items.length} sesi HADIR`}
      >
        <Button asChild variant="outline" size="sm">
          <a href={`/api/export/payroll/${payroll.id}?format=pdf`} target="_blank" rel="noopener noreferrer">
            <Download />
            PDF
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/export/payroll/${payroll.id}?format=excel`} download>
            <Download />
            Excel
          </a>
        </Button>
        <PayrollStatusActions
          payroll={{
            id: payroll.id,
            teacherName: payroll.teacher.name,
            periodMonth: payroll.periodMonth,
            periodYear: payroll.periodYear,
            status: payroll.status,
            total: payroll.total,
            itemCount: payroll.items.length,
          }}
        />
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <PayrollStatusBadge status={payroll.status} />
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-xs text-muted-foreground">Grand Total</span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {formatRupiah(payroll.total)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Murid</TableHead>
                  <TableHead className="text-right">Tarif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Tidak ada sesi HADIR pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  payroll.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDbDate(item.session.date)}</TableCell>
                      <TableCell>{item.session.startTime}</TableCell>
                      <TableCell>{item.session.student.name}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.rate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {payroll.items.length > 0 ? (
                <tfoot>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(payroll.total)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              ) : null}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
