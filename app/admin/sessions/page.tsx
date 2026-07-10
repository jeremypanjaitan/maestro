import { prisma } from "@/lib/prisma";
import { GenerateSessionsDialog } from "@/components/generate-sessions-dialog";
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Kelola Sesi
        </h1>
        <GenerateSessionsDialog />
      </div>

      <SessionsTable sessions={sessionRecords} teachers={teachers} />
    </div>
  );
}
