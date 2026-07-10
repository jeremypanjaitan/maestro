import { prisma } from "@/lib/prisma";
import { GeneratePayrollDialog } from "@/components/generate-payroll-dialog";
import { PayrollTable, type PayrollRecord } from "@/components/payroll-table";

export default async function AdminPayrollPage() {
  const [payrolls, teachers] = await Promise.all([
    prisma.payroll.findMany({
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      include: {
        teacher: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const payrollRecords: PayrollRecord[] = payrolls.map((payroll) => ({
    id: payroll.id,
    teacherName: payroll.teacher.name,
    periodMonth: payroll.periodMonth,
    periodYear: payroll.periodYear,
    status: payroll.status,
    total: payroll.total,
    itemCount: payroll._count.items,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Payroll
        </h1>
        <GeneratePayrollDialog teachers={teachers} />
      </div>

      <PayrollTable payrolls={payrollRecords} />
    </div>
  );
}
