import type { ReactNode } from "react";
import { Download } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  getAttendanceRecap,
  getTeachingHoursRecap,
  getStudentProgressRecap,
  getPayrollRecap,
} from "@/lib/queries/reports";
import { formatRupiah } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ReportFilters } from "@/components/report-filters";
import { SessionStatusBadge, PayrollStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
          <Download />
          PDF
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`${base}?${query}${sep}format=excel`} download>
          <Download />
          Excel
        </a>
      </Button>
    </div>
  );
}

/** Small metric tile for a tab's summary strip (compact StatCard variant). */
function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tracking-tight text-foreground">{value}</span>
      </CardContent>
    </Card>
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
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description="Rekap absensi, jam mengajar, perkembangan murid, dan payroll."
      />

      <ReportFilters teachers={teachers} students={students} {...filters} />

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Rekap Absensi</TabsTrigger>
          <TabsTrigger value="hours">Jam Mengajar</TabsTrigger>
          <TabsTrigger value="progress">Perkembangan Murid</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Total" value={attendance.total} />
              <StatTile label="Hadir" value={attendance.counts.HADIR} />
              <StatTile label="Murid Tidak Hadir" value={attendance.counts.MURID_TIDAK_HADIR} />
              <StatTile label="Guru Tidak Hadir" value={attendance.counts.GURU_TIDAK_HADIR} />
              <StatTile label="Reschedule" value={attendance.counts.RESCHEDULE} />
              <StatTile label="Cancel" value={attendance.counts.CANCEL} />
            </div>
            <ExportLinks reportType="attendance" query={query} />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
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
                          <TableCell>
                            <SessionStatusBadge status={row.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Total Sesi" value={hours.grandTotalSessions} />
              <StatTile label="Hadir" value={hours.grandTotalHadir} />
              <StatTile
                label="Total Jam"
                value={Math.round((hours.grandTotalMinutes / 60) * 100) / 100}
              />
            </div>
            <ExportLinks reportType="hours" query={query} />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guru</TableHead>
                      <TableHead className="text-right">Total Sesi</TableHead>
                      <TableHead className="text-right">Hadir</TableHead>
                      <TableHead className="text-right">Total Jam</TableHead>
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
                          <TableCell className="font-medium">{row.teacherName}</TableCell>
                          <TableCell className="text-right">{row.totalSessions}</TableCell>
                          <TableCell className="text-right">{row.hadirSessions}</TableCell>
                          <TableCell className="text-right">{row.totalHours}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <StatTile label="Total Murid" value={progress.rows.length} />
            <ExportLinks reportType="progress" query={query} />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Murid</TableHead>
                      <TableHead className="text-right">Total Sesi</TableHead>
                      <TableHead className="text-right">Hadir</TableHead>
                      <TableHead className="text-right">Laporan</TableHead>
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
                          <TableCell className="font-medium">{row.studentName}</TableCell>
                          <TableCell className="text-right">{row.totalSessions}</TableCell>
                          <TableCell className="text-right">{row.hadirSessions}</TableCell>
                          <TableCell className="text-right">{row.reportCount}</TableCell>
                          <TableCell>{row.latestReportDate ?? "-"}</TableCell>
                          <TableCell>{row.latestGrade ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <StatTile label="Grand Total" value={formatRupiah(payroll.grandTotal)} />
            <ExportLinks reportType="payroll" query={query} />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guru</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                          <TableCell className="font-medium">{row.teacherName}</TableCell>
                          <TableCell>{row.period}</TableCell>
                          <TableCell>
                            <PayrollStatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="text-right">{formatRupiah(row.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
