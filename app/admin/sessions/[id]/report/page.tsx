import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { buildDataUrl } from "@/lib/files";
import { formatDbDate } from "@/lib/domain/dbDate";
import { PageHeader } from "@/components/page-header";
import { SessionStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminSessionReportPageProps = {
  params: Promise<{ id: string }>;
};

const TYPE_LABELS: Record<"PHOTO" | "VIDEO" | "AUDIO", string> = {
  PHOTO: "Foto",
  VIDEO: "Video",
  AUDIO: "Audio",
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
 * Read-only admin view of a session's lesson report (attendance context +
 * materi/catatan + lampiran). Mirrors `app/guru/sessions/[id]/report/page.tsx`
 * but with no form/uploader -- admins can view what a guru submitted, never
 * edit it here. ADMIN access is already enforced by `app/admin/layout.tsx`;
 * this route intentionally has no per-teacher ownership check since ADMIN
 * may view any session's report.
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
  const attachments = report?.attachments ?? [];

  // Legacy fields (target/result/homework/grade) are only shown when
  // present -- current reports only collect material + notes, but older
  // rows may still carry these.
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
        <CardContent>
          {report ? (
            <div className="flex flex-col gap-4">
              <ReadOnlyField label="Materi" value={report.material} />
              <ReadOnlyField label="Catatan" value={report.notes} />
              {legacyFields.map((field) => (
                <ReadOnlyField key={field.label} label={field.label} value={field.value} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Guru belum mengisi laporan untuk sesi ini.
            </p>
          )}
        </CardContent>
      </Card>

      {report ? (
        <Card>
          <CardHeader>
            <CardTitle>Lampiran</CardTitle>
          </CardHeader>
          <CardContent>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada lampiran.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {attachments.map((attachment) => {
                  const url = buildDataUrl(attachment.mimeType, attachment.dataBase64);
                  return (
                    <div key={attachment.id} className="flex flex-col gap-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{TYPE_LABELS[attachment.type]}</span>
                        <span className="truncate">{attachment.filename}</span>
                      </div>

                      {attachment.type === "PHOTO" && (
                        // eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not a static asset next/image can optimize
                        <img
                          src={url}
                          alt={attachment.filename}
                          className="max-h-48 w-full rounded object-cover"
                        />
                      )}
                      {attachment.type === "VIDEO" && (
                        <video controls className="max-h-48 w-full rounded">
                          <source src={url} type={attachment.mimeType} />
                        </video>
                      )}
                      {attachment.type === "AUDIO" && (
                        <audio controls src={url} className="w-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
