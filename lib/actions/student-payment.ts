"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ClassType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDbDate, formatDbDate } from "@/lib/domain/dbDate";
import { NON_HONOR_STATUSES } from "@/lib/domain/constants";
import {
  formatReceiptNumber,
  nextReceiptSeq,
  receiptNumberPrefix,
} from "@/lib/domain/receiptNumber";

export type StudentPaymentActionResult = { ok: true } | { ok: false; error: string };

export type CreateStudentPaymentResult =
  | { ok: true; paymentId: string; number: string; itemCount: number }
  | { ok: false; error: string };

/** Bayar di awal tanpa sesi: the kwitansi shows `description` as its only
 * row (e.g. "Pembayaran les saxophone sesi private untuk 4 pertemuan"). */
export type StudentPaymentPackageInput = {
  description: string;
  meetingCount: number | string;
  classType: ClassType;
};

export type CreateStudentPaymentInput = {
  studentId: string;
  /** Sessions covered. Must be empty when `package` is given. */
  sessionIds: string[];
  package?: StudentPaymentPackageInput;
  /** Total received, in whole Rupiah (defaults to the summed rate in the UI). */
  amount: number | string;
  /** Payment date, "YYYY-MM-DD". Also determines the kwitansi number's month. */
  paidAtISO: string;
  note?: string;
};

/** Defense-in-depth: re-checks ADMIN inside the action, on top of the
 * `app/admin/layout.tsx` guard. Mirrors `lib/actions/honor.ts`. */
async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Tidak diizinkan" };
  }
  return null;
}

function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return formatDbDate(toDbDate(dateStr)) === dateStr;
}

/** True if a P2002 unique violation was on the given column. */
function isUniqueViolationOn(error: unknown, field: string): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target).includes(field);
}

function revalidateStudentPayments() {
  revalidatePath("/admin/student-payments");
}

/**
 * Records a payment received from a student, either for an admin-selected set
 * of the student's sessions, or — when `input.package` is given — as a
 * package paid in advance with no sessions attached yet (just a description
 * and a meeting count). Sessions may be past (bayar di akhir) or still
 * SCHEDULED (bayar di awal). NON_HONOR_STATUSES (CANCEL, RESCHEDULE) are
 * never billable — the same single source of truth as honor payments.
 *
 * Each session's current `rate` is snapshotted onto its item; the kwitansi
 * shows those per-row amounts when they add up to `amount`.
 *
 * The kwitansi number (`KW/RM/YYYY/MM/NNN`, per month of `paidAt`) is
 * assigned inside the create; a concurrent create that grabs the same number
 * trips the unique index and we retry once with a fresh sequence.
 */
export async function createStudentPayment(
  input: CreateStudentPaymentInput,
): Promise<CreateStudentPaymentResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { studentId, sessionIds, paidAtISO, note } = input;
  const amount = Number(input.amount);

  if (!studentId) {
    return { ok: false, error: "Murid wajib dipilih" };
  }
  const pkg = input.package;
  let packageData: { description: string; meetingCount: number; classType: ClassType } | null = null;
  if (pkg) {
    const meetingCount = Number(pkg.meetingCount);
    const description = pkg.description?.trim() ?? "";
    if (!description) {
      return { ok: false, error: "Keterangan wajib diisi" };
    }
    if (!Number.isInteger(meetingCount) || meetingCount <= 0) {
      return { ok: false, error: "Jumlah pertemuan tidak valid" };
    }
    if (pkg.classType !== "PRIVATE" && pkg.classType !== "GROUP") {
      return { ok: false, error: "Jenis kelas tidak valid" };
    }
    packageData = { description, meetingCount, classType: pkg.classType };
  } else if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return { ok: false, error: "Pilih minimal satu sesi" };
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "Nominal tidak valid" };
  }
  if (!isValidCalendarDate(paidAtISO)) {
    return { ok: false, error: "Tanggal pembayaran tidak valid" };
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) {
    return { ok: false, error: "Murid tidak ditemukan" };
  }

  const candidates = packageData
    ? []
    : await prisma.session.findMany({
        where: {
          id: { in: sessionIds },
          studentId,
          status: { notIn: NON_HONOR_STATUSES },
          studentPaymentItem: { is: null },
        },
        select: { id: true, rate: true },
      });
  if (!packageData && candidates.length === 0) {
    return {
      ok: false,
      error: "Sesi yang dipilih sudah dibayar atau tidak valid",
    };
  }

  const paidAt = toDbDate(paidAtISO);
  const [year, month] = paidAtISO.split("-").map(Number);
  const prefix = receiptNumberPrefix(year, month);
  const trimmedNote = note?.trim() ? note.trim() : null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const payment = await prisma.$transaction(async (tx) => {
        const existing = await tx.studentPayment.findMany({
          where: { number: { startsWith: prefix } },
          select: { number: true },
        });
        const number = formatReceiptNumber(year, month, nextReceiptSeq(existing.map((p) => p.number)));
        return tx.studentPayment.create({
          data: {
            number,
            studentId,
            amount,
            paidAt,
            note: trimmedNote,
            ...packageData,
            items: {
              create: candidates.map((s) => ({
                sessionId: s.id,
                rateSnapshot: s.rate,
              })),
            },
          },
          select: { id: true, number: true },
        });
      });

      revalidateStudentPayments();
      return {
        ok: true,
        paymentId: payment.id,
        number: payment.number,
        itemCount: packageData ? packageData.meetingCount : candidates.length,
      };
    } catch (error) {
      if (isUniqueViolationOn(error, "number") && attempt === 0) continue;
      if (isUniqueViolationOn(error, "sessionId")) {
        return {
          ok: false,
          error: "Sebagian sesi sudah dibayar oleh pembayaran lain. Muat ulang halaman.",
        };
      }
      throw error;
    }
  }
  return { ok: false, error: "Gagal membuat nomor kwitansi, coba lagi" };
}

/**
 * Deletes a student payment. Cascades to its items, so every session it
 * covered reverts to "belum dibayar". The kwitansi number is not reused.
 */
export async function deleteStudentPayment(id: string): Promise<StudentPaymentActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    await prisma.studentPayment.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, error: "Pembayaran tidak ditemukan" };
    }
    throw error;
  }

  revalidateStudentPayments();
  return { ok: true };
}

/**
 * Moves a paid-for item ("kredit") off a CANCEL session onto another unpaid,
 * billable session of the same student. `rateSnapshot` is kept, so the
 * kwitansi total is unchanged — only which meeting it covers.
 *
 * (RESCHEDULE needs no manual move: `rescheduleSession` carries the item to
 * the replacement session automatically.)
 */
export async function moveStudentPaymentItem(
  itemId: string,
  targetSessionId: string,
): Promise<StudentPaymentActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const item = await prisma.studentPaymentItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      session: { select: { status: true } },
      studentPayment: { select: { studentId: true } },
    },
  });
  if (!item) {
    return { ok: false, error: "Kredit tidak ditemukan" };
  }
  if (item.session.status !== "CANCEL") {
    return { ok: false, error: "Hanya sesi yang dibatalkan yang bisa dipindahkan" };
  }

  const target = await prisma.session.findFirst({
    where: {
      id: targetSessionId,
      studentId: item.studentPayment.studentId,
      status: { notIn: NON_HONOR_STATUSES },
      studentPaymentItem: { is: null },
    },
    select: { id: true },
  });
  if (!target) {
    return { ok: false, error: "Sesi tujuan sudah dibayar atau tidak valid" };
  }

  try {
    await prisma.studentPaymentItem.update({
      where: { id: item.id },
      data: { sessionId: target.id },
    });
  } catch (error) {
    if (isUniqueViolationOn(error, "sessionId")) {
      return { ok: false, error: "Sesi tujuan sudah dibayar. Muat ulang halaman." };
    }
    throw error;
  }

  revalidateStudentPayments();
  return { ok: true };
}
