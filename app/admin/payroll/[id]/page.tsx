import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { PAYROLL_STATUS_LABELS } from "@/lib/domain/constants";
import { formatPeriod, formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Payroll — {payroll.teacher.name} — {period}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge>{PAYROLL_STATUS_LABELS[payroll.status]}</Badge>
            <span className="text-sm text-muted-foreground">
              {payroll.items.length} sesi &middot; total {formatRupiah(payroll.total)}
            </span>
          </div>
        </div>

        {/* Export buttons (PDF/CSV) are added in Task 20. */}
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
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam</TableHead>
              <TableHead>Murid</TableHead>
              <TableHead>Tarif</TableHead>
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
                  <TableCell>{formatRupiah(item.rate)}</TableCell>
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
                <TableCell className="font-medium">{formatRupiah(payroll.total)}</TableCell>
              </TableRow>
            </tfoot>
          ) : null}
        </Table>
      </div>
    </div>
  );
}
