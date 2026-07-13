import { prisma } from "@/lib/prisma";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import { GenerateSessionsDialog } from "@/components/generate-sessions-dialog";
import { AddSessionDialog } from "@/components/add-session-dialog";
import { PageHeader } from "@/components/page-header";
import { SessionsTable, type SessionRecord } from "@/components/sessions-table";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function startOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
}

function endOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  // Date range drives the DB query (default: current month). Lets ad-hoc
  // sessions on any date be found by setting Dari/Sampai.
  const fromISO = sp.from && YMD.test(sp.from) ? sp.from : formatDbDate(startOfCurrentMonthUTC());
  const toISO = sp.to && YMD.test(sp.to) ? sp.to : formatDbDate(endOfCurrentMonthUTC());

  const [sessions, teachers, students] = await Promise.all([
    prisma.session.findMany({
      where: {
        date: { gte: toDbDate(fromISO), lte: toDbDate(toISO) },
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
    prisma.student.findMany({
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
    classType: session.classType,
    rate: session.rate,
    teacher: session.teacher,
    student: { id: session.student.id, name: session.student.name },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Sesi"
        description="Atur rentang tanggal (Dari/Sampai) untuk melihat sesi periode lain."
      >
        <AddSessionDialog teachers={teachers} students={students} />
        <GenerateSessionsDialog />
      </PageHeader>

      <SessionsTable
        sessions={sessionRecords}
        teachers={teachers}
        students={students}
        initialFrom={fromISO}
        initialTo={toISO}
      />
    </div>
  );
}
