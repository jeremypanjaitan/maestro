import { prisma } from "@/lib/prisma";
import { GenerateSessionsDialog } from "@/components/generate-sessions-dialog";
import { PageHeader } from "@/components/page-header";
import { SessionsTable, type SessionRecord } from "@/components/sessions-table";

function startOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
}

function endOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
}

export default async function AdminSessionsPage() {
  const [sessions, teachers] = await Promise.all([
    prisma.session.findMany({
      where: {
        date: { gte: startOfCurrentMonthUTC(), lte: endOfCurrentMonthUTC() },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        teacher: { select: { id: true, name: true } },
        student: { select: { id: true, name: true, instrument: true } },
        schedule: { select: { instrument: true } },
      },
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const sessionRecords: SessionRecord[] = sessions.map((session) => ({
    id: session.id,
    date: session.date,
    startTime: session.startTime,
    durationMinutes: session.durationMinutes,
    status: session.status,
    instrument: session.schedule?.instrument ?? session.student.instrument,
    teacher: session.teacher,
    student: { id: session.student.id, name: session.student.name },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Sesi"
        description="Sesi bulan berjalan yang dibuat dari jadwal aktif."
      >
        <GenerateSessionsDialog />
      </PageHeader>

      <SessionsTable sessions={sessionRecords} teachers={teachers} />
    </div>
  );
}
