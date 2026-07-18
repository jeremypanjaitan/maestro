import { getGuruHonorData } from "@/lib/queries/honor";
import { PageHeader } from "@/components/page-header";
import { ClassTypeBadge, SessionStatusBadge, StatusBadge } from "@/components/status-badge";
import { HonorPaymentsTable } from "@/components/honor/honor-payments-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function GuruHonorPage() {
  // Scoped to the signed-in guru's own teacherId inside getGuruHonorData.
  const data = await getGuruHonorData();
  const unpaidCount = data.sessions.filter((s) => !s.paid).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran Honor"
        description="Status honor sesi Anda dan riwayat pembayaran (hanya lihat)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <HonorPaymentsTable payments={data.payments} basePath="/guru/honor" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Sesi ({unpaidCount} belum dibayar)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Murid</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status Sesi</TableHead>
                  <TableHead className="text-right">Pembayaran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Belum ada sesi.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="tabular-nums">{s.dateStr}</TableCell>
                      <TableCell className="tabular-nums">{s.startTime}</TableCell>
                      <TableCell className="font-medium">{s.studentName}</TableCell>
                      <TableCell>
                        <ClassTypeBadge classType={s.classType} />
                      </TableCell>
                      <TableCell>
                        <SessionStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {s.paid ? (
                          <StatusBadge label="Sudah dibayar" tone="green" />
                        ) : (
                          <StatusBadge label="Belum dibayar" tone="amber" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
