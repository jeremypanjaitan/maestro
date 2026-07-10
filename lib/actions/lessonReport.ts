"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type AttachmentType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/actions/session";
import { lessonReportSchema } from "@/lib/validations/lessonReport";
import { base64ByteLength, maxBytesForType, mimeTypeToAttachmentType } from "@/lib/files";

export type LessonReportActionResult =
  | { ok: true; reportId: string }
  | { ok: false; error: string };

export type AttachmentActionResult = { ok: true } | { ok: false; error: string };

export type AddAttachmentInput = {
  type: AttachmentType;
  filename: string;
  mimeType: string;
  /** Pure base64 (no "data:...;base64," prefix) — see `lib/files.ts`. */
  dataBase64: string;
};

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

function revalidateReport(sessionId: string): void {
  revalidatePath(`/guru/sessions/${sessionId}/report`);
  revalidatePath("/guru/sessions");
  revalidatePath("/admin/sessions");
}

/**
 * Creates or updates the (at most one) LessonReport for a session.
 *
 * SECURITY: ownership is enforced by `requireSessionAccess` (ADMIN: any
 * session; GURU: only sessions where they're the assigned teacher, re
 * -derived from `auth()` — never trusted from the caller).
 */
export async function upsertLessonReport(
  sessionId: string,
  input: unknown,
): Promise<LessonReportActionResult> {
  const access = await requireSessionAccess(sessionId);
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = lessonReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const data = parsed.data;

  const report = await prisma.lessonReport.upsert({
    where: { sessionId },
    create: { sessionId, ...data },
    update: { ...data },
  });

  revalidateReport(sessionId);
  return { ok: true, reportId: report.id };
}

/**
 * Attaches a media file (already base64-encoded client-side) to a lesson
 * report.
 *
 * SECURITY: ownership is re-checked here, not just at report-creation time
 * -- loads the report to find its `sessionId`, then re-runs
 * `requireSessionAccess` so a guru can't add attachments to another
 * teacher's report by guessing/enumerating report ids.
 *
 * Also re-validates size and type SERVER-SIDE: `type` must match what
 * `mimeType` actually implies (never trust the client's claimed type), and
 * the decoded byte size (derived from the base64 string's length, not a
 * client-reported number) must be under that kind's cap. A client-side
 * check in `lib/files.ts` exists too, but it's advisory only -- it can be
 * bypassed by calling this action directly.
 */
export async function addAttachment(
  reportId: string,
  input: AddAttachmentInput,
): Promise<AttachmentActionResult> {
  const report = await prisma.lessonReport.findUnique({ where: { id: reportId } });
  if (!report) {
    return { ok: false, error: "Laporan tidak ditemukan" };
  }

  const access = await requireSessionAccess(report.sessionId);
  if (!access.ok) return { ok: false, error: access.error };

  const { filename, mimeType, dataBase64 } = input;

  if (!filename.trim() || !dataBase64) {
    return { ok: false, error: "Data lampiran tidak lengkap" };
  }

  const expectedType = mimeTypeToAttachmentType(mimeType);
  if (!expectedType || expectedType !== input.type) {
    return { ok: false, error: "Tipe lampiran tidak sesuai dengan jenis file" };
  }

  const approxBytes = base64ByteLength(dataBase64);
  const maxBytes = maxBytesForType(expectedType);
  if (approxBytes > maxBytes) {
    return {
      ok: false,
      error: `Ukuran file melebihi batas maksimum ${Math.round(maxBytes / (1024 * 1024))}MB`,
    };
  }

  await prisma.attachment.create({
    data: {
      lessonReportId: reportId,
      type: expectedType,
      filename: filename.trim(),
      mimeType,
      dataBase64,
    },
  });

  revalidateReport(report.sessionId);
  return { ok: true };
}

/**
 * Deletes a single attachment.
 *
 * SECURITY: loads attachment -> report -> sessionId, then re-runs
 * `requireSessionAccess` so ownership is checked against the *current*
 * caller, not assumed from having reached this far in the UI.
 */
export async function deleteAttachment(id: string): Promise<AttachmentActionResult> {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { lessonReport: { select: { sessionId: true } } },
  });
  if (!attachment) {
    return { ok: false, error: "Lampiran tidak ditemukan" };
  }

  const access = await requireSessionAccess(attachment.lessonReport.sessionId);
  if (!access.ok) return { ok: false, error: access.error };

  try {
    await prisma.attachment.delete({ where: { id } });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Lampiran tidak ditemukan" };
    }
    throw error;
  }

  revalidateReport(attachment.lessonReport.sessionId);
  return { ok: true };
}
