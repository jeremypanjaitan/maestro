import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/actions/session";
import { formatDbDate } from "@/lib/domain/dbDate";
import { LessonReportForm } from "@/components/lesson-report-form";
import { AttachmentUploader } from "@/components/attachment-uploader";

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
        include: { attachments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!sessionRecord) {
    notFound();
  }

  const report = sessionRecord.lessonReport;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Laporan Sesi -- {sessionRecord.student.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDbDate(sessionRecord.date)} · {sessionRecord.startTime}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-foreground">Laporan</h2>
        <LessonReportForm sessionId={sessionRecord.id} report={report} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-foreground">Lampiran</h2>
        <AttachmentUploader
          reportId={report?.id ?? null}
          attachments={report?.attachments ?? []}
        />
      </section>
    </div>
  );
}
