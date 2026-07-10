import { prisma } from "@/lib/prisma";
import { GeneratePayrollDialog } from "@/components/generate-payroll-dialog";
import { PageHeader } from "@/components/page-header";
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
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Gaji guru dihitung dari sesi HADIR pada periode terpilih."
      >
        <GeneratePayrollDialog teachers={teachers} />
      </PageHeader>

      <PayrollTable payrolls={payrollRecords} />
    </div>
  );
}
