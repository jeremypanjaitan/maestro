import {
  getGuruSessions,
  getStudentsForGuru,
  guruSessionsDefaultRange,
} from "@/lib/queries/calendar";
import { GuruAddSessionDialog } from "@/components/guru-add-session-dialog";
import { GuruSessionsTable } from "@/components/guru-sessions-table";
import { PageHeader } from "@/components/page-header";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function GuruSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  // Date range drives the DB query (default: last 14 days -> next 30 days),
  // so sessions outside the default window are reachable via Dari/Sampai.
  const fallback = guruSessionsDefaultRange();
  const fromISO = sp.from && YMD.test(sp.from) ? sp.from : fallback.from;
  const toISO = sp.to && YMD.test(sp.to) ? sp.to : fallback.to;

  // Scoping to the signed-in guru's own teacherId happens inside
  // getGuruSessions -> getCalendarSessions, re-derived from auth() there.
  const [sessions, students] = await Promise.all([
    getGuruSessions({ from: fromISO, to: toISO }),
    getStudentsForGuru(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesi & Absensi"
        description="Tandai kehadiran dan kelola laporan untuk sesi Anda."
      >
        <GuruAddSessionDialog students={students} />
      </PageHeader>

      <GuruSessionsTable
        sessions={sessions}
        initialFrom={fromISO}
        initialTo={toISO}
      />
    </div>
  );
}
