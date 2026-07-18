import { getAdminHonorData } from "@/lib/queries/honor";
import { PageHeader } from "@/components/page-header";
import { HonorTeacherSelect } from "@/components/honor/honor-teacher-select";
import { HonorPaymentsTable } from "@/components/honor/honor-payments-table";
import { SessionStatusTable } from "@/components/honor/session-status-table";
import {
  CreateHonorPaymentDialog,
  type SelectableSession,
} from "@/components/honor/create-honor-payment-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHonorPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const { teacherId } = await searchParams;
  const data = await getAdminHonorData(teacherId);

  const selectedTeacher = data.teachers.find(
    (t) => t.id === data.selectedTeacherId,
  );

  const unpaidSessions: SelectableSession[] = data.sessions
    .filter((s) => !s.paid)
    .map((s) => ({
      id: s.id,
      dateStr: s.dateStr,
      startTime: s.startTime,
      studentName: s.studentName,
      status: s.status,
      rate: s.rate,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran Honor"
        description="Bayar honor guru per sesi, pilih sesi yang dibayar, dan unggah bukti transfer."
      >
        <HonorTeacherSelect
          teachers={data.teachers}
          value={data.selectedTeacherId}
        />
        {selectedTeacher && (
          <CreateHonorPaymentDialog
            teacherId={selectedTeacher.id}
            teacherName={selectedTeacher.name}
            sessions={unpaidSessions}
          />
        )}
      </PageHeader>

      {!selectedTeacher ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Pilih guru untuk melihat status sesi dan riwayat pembayaran honor.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pembayaran — {selectedTeacher.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <HonorPaymentsTable
                payments={data.payments}
                basePath="/admin/honor"
                canDelete
              />
            </CardContent>
          </Card>

          <SessionStatusTable sessions={data.sessions} />
        </>
      )}
    </div>
  );
}
