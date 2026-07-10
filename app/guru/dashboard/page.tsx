import type { SessionStatus } from "@prisma/client";
import { CalendarClock, Wallet, Users } from "lucide-react";

import { getGuruDashboard } from "@/lib/queries/dashboard";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_STATUS_LABELS } from "@/lib/domain/constants";
import { formatPeriod, formatRupiah } from "@/lib/utils";

const STATUS_BADGE_VARIANT: Record<
  SessionStatus,
  "default" | "outline" | "secondary" | "destructive"
> = {
  SCHEDULED: "outline",
  HADIR: "default",
  MURID_TIDAK_HADIR: "secondary",
  GURU_TIDAK_HADIR: "secondary",
  RESCHEDULE: "secondary",
  CANCEL: "destructive",
};

export default async function GuruDashboardPage() {
  const data = await getGuruDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Halo, {data.teacherName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan jadwal dan sesi Anda hari ini.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Sesi Hari Ini"
          value={data.todaySessions.length}
          icon={CalendarClock}
        />
        <StatCard
          title="Estimasi Honor Bulan Ini"
          value={formatRupiah(data.estimatedHonor)}
          subtitle={`${data.hadirCountThisMonth} sesi hadir · ${formatPeriod(data.periodMonth, data.periodYear)}`}
          icon={Wallet}
        />
        <StatCard
          title="Murid Diajar Bulan Ini"
          value={data.distinctStudentCount}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
                        {s.student.instrument}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[s.status]}>
                      {SESSION_STATUS_LABELS[s.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress Murid Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {data.studentProgressSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada sesi bulan ini.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.studentProgressSummary.map((p) => (
                  <li key={p.studentId} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground">{p.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.hadirSessions}/{p.totalSessions} sesi hadir · {p.instrument}
                    </p>
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
