import { prisma } from "@/lib/prisma";
import { SchedulesTable } from "@/components/schedules-table";

export default async function AdminSchedulesPage() {
  const [schedules, teachers, students] = await Promise.all([
    prisma.schedule.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: {
        teacher: { select: { name: true } },
        student: { select: { name: true } },
      },
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, ratePerSession: true, defaultGroupRate: true },
    }),
    prisma.student.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, instrument: true },
    }),
  ]);

  return <SchedulesTable schedules={schedules} teachers={teachers} students={students} />;
}
