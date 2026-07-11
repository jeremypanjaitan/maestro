"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AttachmentType } from "@prisma/client";

import {
  addAttachment,
  deleteAttachment,
  upsertLessonReport,
} from "@/lib/actions/lessonReport";
import { buildDataUrl, fileToBase64, validateFile } from "@/lib/files";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type AttachmentRecord = {
  id: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  dataBase64: string;
};

type AttachmentUploaderProps = {
  /** The session this report belongs to -- used to auto-create the
   * LessonReport row on first upload so the user doesn't have to press
   * "Simpan Laporan" first. */
  sessionId: string;
  /** `null` until the lesson report has been saved at least once. When
   * null, the first file upload will create the report automatically. */
  reportId: string | null;
  attachments: AttachmentRecord[];
};

const TYPE_LABELS: Record<AttachmentType, string> = {
  PHOTO: "Foto",
  VIDEO: "Video",
  AUDIO: "Audio",
};

/**
 * File input + attachment gallery for a lesson report. On file select:
 * validates type/size client-side (`lib/files.ts`, advisory only), reads
 * the file into pure base64 (`fileToBase64`), and calls `addAttachment` --
 * which re-validates type/size server-side regardless. Existing
 * attachments are rendered from their stored (mimeType, dataBase64) pair
 * via `buildDataUrl`, matching exactly how they were uploaded: PHOTO as
 * `<img>`, VIDEO as `<video controls>`, AUDIO as `<audio controls>`.
 */
export function AttachmentUploader({
  sessionId,
  reportId,
  attachments,
}: AttachmentUploaderProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    try {
      // Ensure a LessonReport exists: create an empty one on the fly if the
      // user hasn't pressed "Simpan Laporan" yet.
      let targetReportId = reportId;
      if (!targetReportId) {
        const created = await upsertLessonReport(sessionId, {});
        if (!created.ok) {
          toast.error(created.error);
          return;
        }
        targetReportId = created.reportId;
      }

      const dataBase64 = await fileToBase64(file);
      const result = await addAttachment(targetReportId, {
        type: validation.type,
        filename: file.name,
        mimeType: file.type,
        dataBase64,
      });
      if (result.ok) {
        toast.success("Lampiran berhasil ditambahkan");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Gagal membaca file");
    } finally {
      setIsUploading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const result = await deleteAttachment(pendingDeleteId);
    if (result.ok) {
      toast.success("Lampiran dihapus");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPendingDeleteId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="text-sm"
        />
        {isUploading && <span className="text-sm text-muted-foreground">Mengunggah...</span>}
      </div>

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

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingDeleteId(attachment.id)}
                >
                  Hapus
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus lampiran?</AlertDialogTitle>
            <AlertDialogDescription>
              Lampiran ini akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Ya, hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
