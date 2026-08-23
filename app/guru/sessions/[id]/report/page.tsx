import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/actions/session";
import { formatDbDate } from "@/lib/domain/dbDate";
import { PageHeader } from "@/components/page-header";
import { LessonReportForm } from "@/components/lesson-report-form";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { ReportAuditLine } from "@/components/report-audit-line";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SessionReportPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Lesson report + media attachments for a single session.
 *
 * SECURITY: `requireSessionAccess` is the same ownership guard the session
 * actions use (ADMIN: any session; GURU: only sessions where they're the
 * assigned teacher, re-derived from `auth()`). A guru who navigates here
 * with another teacher's session id gets `notFound()` -- this route must
 * not leak whether a session id exists to someone who doesn't own it, so
 * "not found" is used uniformly rather than a distinct "forbidden" page.
 */
export default async function SessionReportPage({ params }: SessionReportPageProps) {
  const { id } = await params;

  const authSession = await auth();
  if (!authSession?.user) {
    redirect("/login");
  }

  const access = await requireSessionAccess(id);
  if (!access.ok) {
    notFound();
  }

  const sessionRecord = await prisma.session.findUnique({
    where: { id },
    include: {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Laporan Sesi — ${sessionRecord.student.name}`}
        description={`${formatDbDate(sessionRecord.date)} · ${sessionRecord.startTime}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Laporan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LessonReportForm sessionId={sessionRecord.id} report={report} />

          {/* Surfaces admin edits to the guru: if an admin corrected this
              report, the guru sees who and when rather than finding their
              own text quietly changed. */}
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
