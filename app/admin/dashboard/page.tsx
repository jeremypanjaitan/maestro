import { Users, GraduationCap, CalendarClock } from "lucide-react";

import { getAdminDashboard } from "@/lib/queries/dashboard";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SessionStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Admin"
        description="Ringkasan sekolah musik hari ini."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Murid Aktif"
          value={data.totalActiveStudents}
          icon={Users}
        />
        <StatCard
          title="Total Guru Aktif"
          value={data.totalActiveTeachers}
          icon={GraduationCap}
        />
        <StatCard
          title="Sesi Hari Ini"
          value={data.todaySessions.length}
          icon={CalendarClock}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Jadwal Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {data.todaySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada sesi terjadwal hari ini.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.todaySessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {s.startTime} · {s.student.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Guru: {s.teacher.name}
                      </p>
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
