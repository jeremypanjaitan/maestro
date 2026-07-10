import type { AttachmentType } from "@prisma/client";

/**
 * Media-upload helpers shared by the client uploader component and the
 * `addAttachment` server action.
 *
 * Convention: `dataBase64` (both in the DB and everywhere in this app's
 * code) is *pure* base64 — no `data:<mime>;base64,` prefix. `mimeType` is
 * stored separately (see `Attachment.mimeType`), and the prefix is rebuilt
 * with `buildDataUrl` only at render time. Keep this convention consistent
 * end to end: `fileToBase64` strips the prefix on the way in, and nothing
 * in `lib/actions/lessonReport.ts` should ever write a prefixed string to
 * `dataBase64`.
 */

/** Photos are capped tighter than video/audio since they're rendered inline
 * (as <img>) far more often and don't need to hold much resolution for a
 * lesson-report thumbnail. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const MEDIA_MAX_BYTES = 15 * 1024 * 1024; // 15 MB (video/audio)

/** Maps a MIME type to the `AttachmentType` enum bucket it belongs to, or
 * `null` if it's not an accepted kind. Used both client-side (to pick the
 * right size limit before upload) and server-side (to re-derive the type
 * from `mimeType` rather than trusting whatever the client claims). */
export function mimeTypeToAttachmentType(mimeType: string): AttachmentType | null {
  if (mimeType.startsWith("image/")) return "PHOTO";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return null;
}

/** Byte cap for a given attachment kind. */
export function maxBytesForType(type: AttachmentType): number {
  return type === "PHOTO" ? PHOTO_MAX_BYTES : MEDIA_MAX_BYTES;
}

/**
 * Approximate decoded byte size of a *pure* base64 string (no prefix).
 * Base64 encodes 3 bytes as 4 characters, so decoded size is
 * `len * 3/4`, minus 1 or 2 bytes for `=`/`==` padding at the end.
 * This is exact for validly-padded base64, which is all we ever produce
 * or accept.
 */
export function base64ByteLength(base64: string): number {
  const len = base64.length;
  if (len === 0) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

export type FileValidationResult =
  | { ok: true; type: AttachmentType }
  | { ok: false; error: string };

/** Client-side pre-flight check: is this File an accepted kind, and is it
 * under that kind's size cap? Purely advisory — `addAttachment` re-checks
 * both on the server, since a client check can always be bypassed. */
export function validateFile(file: File): FileValidationResult {
  const type = mimeTypeToAttachmentType(file.type);
  if (!type) {
    return { ok: false, error: "Jenis file tidak didukung (harus foto, video, atau audio)" };
  }

  const max = maxBytesForType(type);
  if (file.size > max) {
    return {
      ok: false,
      error: `Ukuran file maksimum ${Math.round(max / (1024 * 1024))}MB`,
    };
  }

  return { ok: true, type };
}

/**
 * Reads a `File` into a pure base64 string (the `data:...;base64,` prefix
 * that `FileReader.readAsDataURL` produces is stripped before resolving).
 * Client-only (uses `FileReader`) — never call this from a server action.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Gagal membaca file"));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

/** Rebuilds a renderable data URL from the stored (mimeType, pure base64)
 * pair — the mirror image of what `fileToBase64` strips off. */
export function buildDataUrl(mimeType: string, dataBase64: string): string {
  return `data:${mimeType};base64,${dataBase64}`;
}
