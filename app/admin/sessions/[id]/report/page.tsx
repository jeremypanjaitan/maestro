import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { PageHeader } from "@/components/page-header";
import { SessionStatusBadge } from "@/components/status-badge";
import { LessonReportForm } from "@/components/lesson-report-form";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminSessionReportPageProps = {
  params: Promise<{ id: string }>;
};

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {value ? (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

/**
 * Admin view of a session's lesson report (attendance context +
 * materi/catatan + lampiran). Uses the same form/uploader as
 * `app/guru/sessions/[id]/report/page.tsx`, so an admin can fill in or edit
 * a report on behalf of the guru. ADMIN access is already enforced by
 * `app/admin/layout.tsx`, and the server actions re-check it via
 * `requireSessionAccess` (ADMIN may act on any session).
 */
export default async function AdminSessionReportPage({ params }: AdminSessionReportPageProps) {
  const { id } = await params;

  const sessionRecord = await prisma.session.findUnique({
    where: { id },
    include: {
      teacher: { select: { name: true } },
      student: { select: { name: true } },
      lessonReport: {
        include: { attachments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!sessionRecord) {
    notFound();
  }

  const report = sessionRecord.lessonReport;

  // Legacy fields (target/result/homework/grade) are only shown when
  // present -- current reports only collect material + notes, but older
  // rows may still carry these. The form doesn't edit them.
  const legacyFields: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Target", value: report?.target },
    { label: "Hasil", value: report?.result },
    { label: "PR", value: report?.homework },
    { label: "Nilai", value: report?.grade },
  ].filter((field) => field.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Laporan Sesi — ${sessionRecord.student.name}`}
        description={`${formatDbDate(sessionRecord.date)} · ${sessionRecord.startTime} · ${sessionRecord.teacher.name}`}
      >
        <SessionStatusBadge status={sessionRecord.status} />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Laporan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LessonReportForm sessionId={sessionRecord.id} report={report} />
          {legacyFields.map((field) => (
            <ReadOnlyField key={field.label} label={field.label} value={field.value} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lampiran</CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentUploader
            sessionId={sessionRecord.id}
            reportId={report?.id ?? null}
            attachments={report?.attachments ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
