import { getGuruHonorData } from "@/lib/queries/honor";
import { PageHeader } from "@/components/page-header";
import { HonorPaymentsTable } from "@/components/honor/honor-payments-table";
import { SessionStatusTable } from "@/components/honor/session-status-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GuruHonorPage() {
  // Scoped to the signed-in guru's own teacherId inside getGuruHonorData.
  const data = await getGuruHonorData();

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

      <SessionStatusTable sessions={data.sessions} basePath="/guru/honor" />
    </div>
  );
}
