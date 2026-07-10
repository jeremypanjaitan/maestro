import { prisma } from "@/lib/prisma";
import {
  getAttendanceRecap,
  getTeachingHoursRecap,
  getStudentProgressRecap,
  getPayrollRecap,
} from "@/lib/queries/reports";
import { formatRupiah } from "@/lib/utils";
import { ReportFilters } from "@/components/report-filters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminReportsPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    teacherId?: string;
    studentId?: string;
  }>;
};

/** Builds the `from`/`to`/`teacherId`/`studentId` querystring shared by every
 * export link on the page, so each tab's "Export PDF/Excel" button carries
 * the currently active filters. */
function filterQuery(filters: {
  from?: string;
  to?: string;
  teacherId?: string;
  studentId?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.teacherId) params.set("teacherId", filters.teacherId);
  if (filters.studentId) params.set("studentId", filters.studentId);
  return params.toString();
}

function ExportLinks({ reportType, query }: { reportType: string; query: string }) {
  const base = `/api/export/report/${reportType}`;
  const sep = query ? "&" : "";
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`${base}?${query}${sep}format=pdf`} target="_blank" rel="noopener noreferrer">
          Export PDF
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`${base}?${query}${sep}format=excel`} download>
          Export Excel
        </a>
      </Button>
    </div>
  );
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  const params = await searchParams;

  const filters = {
    from: params.from || undefined,
    to: params.to || undefined,
    teacherId: params.teacherId || undefined,
    studentId: params.studentId || undefined,
  };
  const query = filterQuery(filters);

  const [teachers, students, attendance, hours, progress, payroll] = await Promise.all([
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
    getAttendanceRecap(filters),
    getTeachingHoursRecap(filters),
    getStudentProgressRecap(filters),
    getPayrollRecap(filters),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Laporan</h1>

      <ReportFilters teachers={teachers} students={students} {...filters} />

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Rekap Absensi</TabsTrigger>
          <TabsTrigger value="hours">Jam Mengajar</TabsTrigger>
          <TabsTrigger value="progress">Perkembangan Murid</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-foreground">Total: {attendance.total}</span>
              <span>Hadir: {attendance.counts.HADIR}</span>
              <span>Murid Tidak Hadir: {attendance.counts.MURID_TIDAK_HADIR}</span>
              <span>Guru Tidak Hadir: {attendance.counts.GURU_TIDAK_HADIR}</span>
              <span>Reschedule: {attendance.counts.RESCHEDULE}</span>
              <span>Cancel: {attendance.counts.CANCEL}</span>
              <span>Terjadwal: {attendance.counts.SCHEDULED}</span>
            </div>
            <ExportLinks reportType="attendance" query={query} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Guru</TableHead>
                  <TableHead>Murid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Tidak ada data pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.details.map((row, index) => (
                    <TableRow key={`${row.date}-${row.teacherName}-${row.studentName}-${index}`}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.teacherName}</TableCell>
                      <TableCell>{row.studentName}</TableCell>
                      <TableCell>{row.statusLabel}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-foreground">
                Total Sesi: {hours.grandTotalSessions}
              </span>
              <span>Hadir: {hours.grandTotalHadir}</span>
              <span>
                Total Jam: {Math.round((hours.grandTotalMinutes / 60) * 100) / 100}
              </span>
            </div>
            <ExportLinks reportType="hours" query={query} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guru</TableHead>
                  <TableHead>Total Sesi</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Total Jam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hours.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Tidak ada data pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  hours.rows.map((row) => (
                    <TableRow key={row.teacherId}>
                      <TableCell>{row.teacherName}</TableCell>
                      <TableCell>{row.totalSessions}</TableCell>
                      <TableCell>{row.hadirSessions}</TableCell>
                      <TableCell>{row.totalHours}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">
              Total Murid: {progress.rows.length}
            </div>
            <ExportLinks reportType="progress" query={query} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Murid</TableHead>
                  <TableHead>Total Sesi</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Laporan</TableHead>
                  <TableHead>Laporan Terakhir</TableHead>
                  <TableHead>Nilai Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progress.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Tidak ada data pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  progress.rows.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell>{row.studentName}</TableCell>
                      <TableCell>{row.totalSessions}</TableCell>
                      <TableCell>{row.hadirSessions}</TableCell>
                      <TableCell>{row.reportCount}</TableCell>
                      <TableCell>{row.latestReportDate ?? "-"}</TableCell>
                      <TableCell>{row.latestGrade ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">
              Grand Total: {formatRupiah(payroll.grandTotal)}
            </div>
            <ExportLinks reportType="payroll" query={query} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guru</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Tidak ada data pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  payroll.rows.map((row) => (
                    <TableRow key={row.payrollId}>
                      <TableCell>{row.teacherName}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.statusLabel}</TableCell>
                      <TableCell>{formatRupiah(row.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
