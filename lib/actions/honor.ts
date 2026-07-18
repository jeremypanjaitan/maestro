"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import {
  base64ByteLength,
  isAcceptedProofMime,
  normalizeMimeType,
  PROOF_MAX_BYTES,
} from "@/lib/files";

export type HonorActionResult = { ok: true } | { ok: false; error: string };

export type CreateHonorPaymentResult =
  | { ok: true; paymentId: string; itemCount: number }
  | { ok: false; error: string };

/** A single proof file, pure base64 (no `data:` prefix) + its mime — same
 * convention as `Attachment.dataBase64` (see `lib/files.ts`). */
export type ProofInput = {
  filename: string;
  mimeType: string;
  dataBase64: string;
};

export type CreateHonorPaymentInput = {
  teacherId: string;
  sessionIds: string[];
  /** Manual total honor amount, in whole Rupiah. */
  amount: number | string;
  /** Payment date, "YYYY-MM-DD". */
  paidAtISO: string;
  note?: string;
  proofs: ProofInput[];
};

/** Defense-in-depth: re-checks ADMIN inside the action, on top of the
 * `app/admin/layout.tsx` guard. Mirrors the pattern in the other actions. */
async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Tidak diizinkan" };
  }
  return null;
}

/** Round-trip a "YYYY-MM-DD" string through the same UTC-anchored `@db.Date`
 * construction to reject both malformed and rolled-over dates (e.g.
 * "2026-02-30"). Same technique as `lib/actions/session.ts`. */
function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return formatDbDate(toDbDate(dateStr)) === dateStr;
}

/** Validates a single proof: accepted kind and under the byte cap (checked
 * against the *decoded* base64 size, not the string length). Returns an error
 * string or null. */
function validateProof(proof: ProofInput): string | null {
  if (!proof || typeof proof.dataBase64 !== "string" || proof.dataBase64.length === 0) {
    return "Bukti tidak valid";
  }
  if (!isAcceptedProofMime(proof.mimeType)) {
    return "Bukti harus berupa gambar atau PDF";
  }
  if (base64ByteLength(proof.dataBase64) > PROOF_MAX_BYTES) {
    return `Ukuran bukti maksimum ${Math.round(PROOF_MAX_BYTES / (1024 * 1024))}MB`;
  }
  return null;
}

/**
 * Records an honor payment to a teacher covering an admin-selected set of the
 * teacher's sessions. The total `amount` is entered manually (NOT summed from
 * session rates); each session's current `rate` is snapshotted onto its
 * `HonorPaymentItem` for reference only.
 *
 * Eligibility (enforced by filtering, so a stale selection can't block the
 * whole call): a session must belong to this teacher and be unclaimed by any
 * existing payment. `HonorPaymentItem.sessionId` is globally unique, so a
 * session can never be paid twice even under a race — the unique violation is
 * caught and surfaced as a friendly error.
 *
 * At least one valid proof file is required — a payment is always created in
 * its final (paid) state with evidence attached.
 */
export async function createHonorPayment(
  input: CreateHonorPaymentInput,
): Promise<CreateHonorPaymentResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { teacherId, sessionIds, paidAtISO, note } = input;
  const amount = Number(input.amount);

  if (!teacherId) {
    return { ok: false, error: "Guru wajib dipilih" };
  }
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return { ok: false, error: "Pilih minimal satu sesi" };
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "Nominal honor tidak valid" };
  }
  if (!isValidCalendarDate(paidAtISO)) {
    return { ok: false, error: "Tanggal pembayaran tidak valid" };
  }
  if (!Array.isArray(input.proofs) || input.proofs.length === 0) {
    return { ok: false, error: "Bukti pembayaran wajib diunggah" };
  }
  for (const proof of input.proofs) {
    const proofError = validateProof(proof);
    if (proofError) return { ok: false, error: proofError };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) {
    return { ok: false, error: "Guru tidak ditemukan" };
  }

  // Eligible = this teacher's sessions, not already claimed by a payment.
  const candidates = await prisma.session.findMany({
    where: {
      id: { in: sessionIds },
      teacherId,
      honorPaymentItem: { is: null },
    },
    select: { id: true, rate: true },
  });
  if (candidates.length === 0) {
    return {
      ok: false,
      error: "Sesi yang dipilih sudah dibayar atau tidak valid",
    };
  }

  const paidAt = toDbDate(paidAtISO);
  const trimmedNote = note?.trim() ? note.trim() : null;

  let payment;
  try {
    payment = await prisma.honorPayment.create({
      data: {
        teacherId,
        amount,
        paidAt,
        note: trimmedNote,
        items: {
          create: candidates.map((s) => ({
            sessionId: s.id,
            rateSnapshot: s.rate,
          })),
        },
        proofs: {
          create: input.proofs.map((p) => ({
            filename: p.filename,
            mimeType: normalizeMimeType(p.mimeType),
            dataBase64: p.dataBase64,
          })),
        },
      },
      select: { id: true },
    });
  } catch (error) {
    // A concurrent payment claimed one of these sessions first
    // (HonorPaymentItem.sessionId unique).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error: "Sebagian sesi sudah dibayar oleh pembayaran lain. Muat ulang halaman.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/honor");
  revalidatePath("/guru/honor");
  return { ok: true, paymentId: payment.id, itemCount: candidates.length };
}

/**
 * Deletes an honor payment. Cascades to its items and proofs (see the
 * `onDelete: Cascade` relations), so every session it covered reverts to
 * "belum dibayar".
 */
export async function deleteHonorPayment(id: string): Promise<HonorActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    await prisma.honorPayment.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, error: "Pembayaran tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/honor");
  revalidatePath("/guru/honor");
  return { ok: true };
}
