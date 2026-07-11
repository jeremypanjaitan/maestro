import { FileAudio } from "lucide-react";

import { buildDataUrl } from "@/lib/files";
import type { TimelineEntry } from "@/lib/queries/history";
import { Card } from "@/components/ui/card";
import { SessionStatusBadge } from "@/components/status-badge";
import { RichText } from "@/components/rich-text";

type StudentTimelineProps = {
  entries: TimelineEntry[];
};

/**
 * Vertical progress timeline for a single student: one card per session,
 * newest at the bottom (entries arrive pre-sorted oldest -> newest from
 * `getStudentTimeline`), each showing status, lesson-report fields, and
 * documentation thumbnails.
 */
export function StudentTimeline({ entries }: StudentTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Belum ada riwayat sesi untuk murid ini.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.sessionId} className="relative pl-6">
          <span
            aria-hidden
            className="absolute top-1.5 left-0 size-2.5 rounded-full bg-primary"
          />
          {/* Connector line to the next entry. */}
          <span
            aria-hidden
            className="absolute top-4 left-[4.5px] -bottom-4 w-px bg-border last:hidden"
          />
          <Card className="gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{entry.date}</span>
                <span className="text-sm text-muted-foreground">{entry.startTime}</span>
              </div>
              <SessionStatusBadge status={entry.status} />
            </div>
            <p className="text-xs text-muted-foreground">Guru: {entry.teacherName}</p>

            {(entry.material || entry.target || entry.result || entry.grade || entry.notes || entry.homework) ? (
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {entry.material ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Materi</dt>
                    <dd className="text-foreground">
                      <RichText html={entry.material} />
                    </dd>
                  </div>
                ) : null}
                {entry.target ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Target</dt>
                    <dd className="text-foreground">{entry.target}</dd>
                  </div>
                ) : null}
                {entry.result ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Hasil</dt>
                    <dd className="text-foreground">{entry.result}</dd>
                  </div>
                ) : null}
                {entry.grade ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Nilai</dt>
                    <dd className="text-foreground">{entry.grade}</dd>
                  </div>
                ) : null}
                {entry.homework ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Tugas</dt>
                    <dd className="text-foreground">{entry.homework}</dd>
                  </div>
                ) : null}
                {entry.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Catatan</dt>
                    <dd className="text-foreground">
                      <RichText html={entry.notes} />
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada laporan untuk sesi ini.</p>
            )}

            {entry.attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {entry.attachments.map((attachment) => {
                  const url = buildDataUrl(attachment.mimeType, attachment.dataBase64);
                  if (attachment.type === "PHOTO") {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element -- base64 data URI, next/image doesn't add value here
                      <img
                        key={attachment.id}
                        src={url}
                        alt={attachment.filename}
                        className="size-20 rounded-md border object-cover"
                      />
                    );
                  }
                  if (attachment.type === "VIDEO") {
                    return (
                      <video
                        key={attachment.id}
                        src={url}
                        controls
                        className="h-20 w-32 rounded-md border bg-muted"
                      />
                    );
                  }
                  // Only AUDIO reaches here (PHOTO/VIDEO are handled above).
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-xs"
                    >
                      <FileAudio className="size-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="max-w-32 truncate text-foreground">{attachment.filename}</span>
                        <audio src={url} controls className="h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>
        </li>
      ))}
    </ol>
  );
}
