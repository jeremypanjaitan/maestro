import imageCompression from "browser-image-compression";
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
  // Normalize first: strip any `;charset=...`/params suffix and casing so a
  // crafted mime like "image/svg+xml;charset=utf-8" or "IMAGE/SVG+XML"
  // can't slip past the raw string comparisons below.
  const m = normalizeMimeType(mimeType);

  // SVG is excluded from "image/*" on purpose: it can embed <script>/event
  // handlers, and this app renders PHOTO attachments as `<img src="data:...">`
  // -- rejecting it here (rather than trusting the browser to sandbox inline
  // SVG rendering) keeps a malicious upload from ever reaching the DOM.
  if (m === "image/svg+xml" || m.startsWith("image/svg")) return null;
  if (m.startsWith("image/")) return "PHOTO";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "AUDIO";
  return null;
}

/**
 * Normalizes a MIME type for comparison/storage: lowercases it and drops
 * any `;charset=...`/parameter suffix. Both `mimeTypeToAttachmentType` and
 * `addAttachment` (before writing to the DB) must go through this so the
 * stored value always matches what was actually validated -- otherwise a
 * client could send a mixed-case or parameterized mime that passes
 * validation but gets persisted (and later re-rendered) in its raw form.
 */
export function normalizeMimeType(mimeType: string): string {
  return mimeType.toLowerCase().split(";")[0].trim();
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

/**
 * Honor-payment proof files. Unlike lesson-report attachments, proofs accept
 * PDF (a transfer receipt is often a PDF) in addition to images, and never
 * accept video/audio. SVG is still rejected (same script-injection reasoning
 * as `mimeTypeToAttachmentType`). Cap is a single 5MB limit for both kinds.
 */
export const PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** True if `mimeType` is an accepted honor-payment proof kind (image — not
 * SVG — or PDF). Used client-side (pre-flight) and server-side (authoritative,
 * re-derived from the normalized mime, never trusting the client). */
export function isAcceptedProofMime(mimeType: string): boolean {
  const m = normalizeMimeType(mimeType);
  if (m === "image/svg+xml" || m.startsWith("image/svg")) return false;
  return m.startsWith("image/") || m === "application/pdf";
}

export type ProofValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Client-side pre-flight for a proof `File`: accepted kind + under the size
 * cap. Advisory only — `createHonorPayment` re-checks both on the server. */
export function validateProofFile(file: File): ProofValidationResult {
  if (!isAcceptedProofMime(file.type)) {
    return { ok: false, error: "Bukti harus berupa gambar atau PDF" };
  }
  if (file.size > PROOF_MAX_BYTES) {
    return {
      ok: false,
      error: `Ukuran bukti maksimum ${Math.round(PROOF_MAX_BYTES / (1024 * 1024))}MB`,
    };
  }
  return { ok: true };
}

/**
 * Compresses an image `File` client-side when it's over 2MB, so large
 * phone-camera photos (3-5MB is common) have a chance to pass the PHOTO
 * `PHOTO_MAX_BYTES` server check instead of being rejected outright.
 *
 * - Non-images and images already at/under 2MB are returned unchanged.
 * - SVG never reaches here in practice (`mimeTypeToAttachmentType` rejects
 *   it upstream), and it can't be raster-compressed anyway, but this
 *   function doesn't special-case it -- if `imageCompression` were ever
 *   handed one, the try/catch below falls back to the original file and
 *   lets the existing size validation handle it.
 * - If compression throws for any reason, fall back to the original file
 *   (again, existing validation is the safety net).
 *
 * Client-only (delegates to `browser-image-compression`, which uses the
 * DOM/canvas/worker APIs) -- never call this from a server action.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= PHOTO_MAX_BYTES) {
    return file;
  }

  try {
    return await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2500,
      useWebWorker: true,
      initialQuality: 0.8,
    });
  } catch {
    return file;
  }
}
