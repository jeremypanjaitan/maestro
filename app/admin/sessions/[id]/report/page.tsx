import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { PageHeader } from "@/components/page-header";
import { SessionStatusBadge } from "@/components/status-badge";
import { LessonReportForm } from "@/components/lesson-report-form";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { ReportAuditLine } from "@/components/report-audit-line";
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
 * Admin view of a session's lesson report — editable, mirroring
 * `app/guru/sessions/[id]/report/page.tsx` so an admin can fill in a report
 * a guru forgot or correct a mistake, instead of only being able to read it.
 *
 * The underlying actions (`upsertLessonReport`, `addAttachment`,
 * `deleteAttachment`) already permitted ADMIN on any session via
 * `requireSessionAccess` — only this page was read-only, so switching it to
 * the shared form components needed no permission changes. Every edit is
 * stamped with `updatedBy*` and surfaced through `<ReportAuditLine>` on both
 * this page and the guru's, so an admin edit is never silent.
 *
 * ADMIN access is enforced by `app/admin/layout.tsx`; this route
 * intentionally has no per-teacher ownership check since ADMIN may act on
 * any session's report.
 */
export default async function AdminSessionReportPage({ params }: AdminSessionReportPageProps) {
  const { id } = await params;

  const sessionRecord = await prisma.session.findUnique({
    where: { id },
    include: {
      teacher: { select: { name: true } },
      student: { select: { name: true } },
      lessonReport: {
        include: {
          attachments: { orderBy: { createdAt: "asc" } },
          updatedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!sessionRecord) {
    notFound();
  }

  const report = sessionRecord.lessonReport;

  // Legacy fields (target/result/homework/grade) are only shown when
  // present -- current reports only collect material + notes, so the form
  // below can't edit these. They stay read-only rather than being dropped,
  // otherwise older rows would silently lose visible data.
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

          {legacyFields.length > 0 ? (
            <div className="flex flex-col gap-4 border-t pt-4">
              {legacyFields.map((field) => (
                <ReadOnlyField key={field.label} label={field.label} value={field.value} />
              ))}
            </div>
          ) : null}

          {report ? (
            <ReportAuditLine
              updatedAt={report.updatedAt}
              updatedByName={report.updatedBy?.name ?? null}
              updatedByRole={report.updatedByRole}
            />
          ) : null}
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
