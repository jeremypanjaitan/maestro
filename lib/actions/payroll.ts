"use server";

import { revalidatePath } from "next/cache";
import type { PayrollStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePayroll } from "@/lib/domain/payroll";

export type PayrollActionResult = { ok: true } | { ok: false; error: string };

export type GeneratePayrollResult =
  | { ok: true; payrollId: string; total: number; itemCount: number }
  | { ok: false; error: string };

/** Defense-in-depth: re-checks the ADMIN role inside the action itself,
 * in addition to the `app/admin/layout.tsx` guard that renders the UI. */
async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Tidak diizinkan" };
  }
  return null;
}

const VALID_STATUSES: PayrollStatus[] = ["DRAFT", "APPROVED", "PAID"];

/** Thrown from inside the `generatePayroll` transaction when the
 * authoritative in-tx PAID re-check trips; caught right outside the
 * transaction and turned into the normal `{ ok: false }` result shape. */
class PayrollPaidError extends Error {}

/** Legal status transitions. PAID is terminal (locked, no further changes).
 * APPROVED may revert to DRAFT for admin correction. */
const ALLOWED_TRANSITIONS: Record<PayrollStatus, PayrollStatus[]> = {
  DRAFT: ["APPROVED"],
  APPROVED: ["PAID", "DRAFT"],
  PAID: [],
};

/**
 * (Re)generates a teacher's payroll for a given month/year: sums their HADIR
 * sessions in that period at `ratePerSession` and upserts a Payroll + its
 * PayrollItems. Idempotent — calling it again for the same period replaces
 * the items rather than duplicating them, and resets the status to DRAFT
 * (unless the existing payroll is already PAID, in which case it refuses).
 */
export async function generatePayroll(
  teacherId: string,
  month: number,
  year: number,
): Promise<GeneratePayrollResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "Bulan tidak valid" };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, error: "Tahun tidak valid" };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { ratePerSession: true },
  });
  if (!teacher) {
    return { ok: false, error: "Guru tidak ditemukan" };
  }

  const existing = await prisma.payroll.findUnique({
    where: {
      teacherId_periodMonth_periodYear: {
        teacherId,
        periodMonth: month,
        periodYear: year,
      },
    },
  });
  if (existing?.status === "PAID") {
    return {
      ok: false,
      error:
        "Payroll periode ini sudah dibayar (PAID) dan tidak bisa di-generate ulang",
    };
  }

  // Month boundaries in UTC, matching how `date @db.Date` columns are stored
  // (see `lib/domain/dbDate.ts`).
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));

  const sessions = await prisma.session.findMany({
    where: {
      teacherId,
      status: "HADIR",
      date: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true, status: true, date: true },
  });

  const { items, total } = computePayroll(
    sessions.map((s) => ({ sessionId: s.id, status: s.status, date: s.date })),
    teacher.ratePerSession,
  );

  let payroll;
  try {
    payroll = await prisma.$transaction(async (tx) => {
      // Authoritative re-check: re-fetch inside the transaction so the
      // PAID-guard and the mutation are atomic. The pre-transaction check
      // above is only a fast path — without this, a concurrent request
      // could race between that check and this write and flip a PAID
      // payroll.
      const current = await tx.payroll.findUnique({
        where: {
          teacherId_periodMonth_periodYear: {
            teacherId,
            periodMonth: month,
            periodYear: year,
          },
        },
      });
      if (current?.status === "PAID") {
        throw new PayrollPaidError(
          "Payroll periode ini sudah dibayar (PAID) dan tidak bisa di-generate ulang",
        );
      }

      if (existing) {
        // Delete before recreating so the globally-unique
        // `PayrollItem.sessionId` never collides with itself.
        await tx.payrollItem.deleteMany({ where: { payrollId: existing.id } });
      }

      const record = await tx.payroll.upsert({
        where: {
          teacherId_periodMonth_periodYear: {
            teacherId,
            periodMonth: month,
            periodYear: year,
          },
        },
        create: { teacherId, periodMonth: month, periodYear: year, status: "DRAFT", total },
        update: { status: "DRAFT", total },
      });

      if (items.length > 0) {
        await tx.payrollItem.createMany({
          data: items.map((item) => ({
            payrollId: record.id,
            sessionId: item.sessionId,
            rate: item.rate,
          })),
        });
      }

      return record;
    });
  } catch (error) {
    if (error instanceof PayrollPaidError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/payroll");
  revalidatePath(`/admin/payroll/${payroll.id}`);
  return { ok: true, payrollId: payroll.id, total: payroll.total, itemCount: items.length };
}

/**
 * Moves a payroll to a new status. Allowed transitions: DRAFT->APPROVED,
 * APPROVED->PAID, and APPROVED->DRAFT (admin correction). Once PAID, the
 * payroll is locked and no further transitions are allowed.
 */
export async function setPayrollStatus(
  id: string,
  status: string,
): Promise<PayrollActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  if (!VALID_STATUSES.includes(status as PayrollStatus)) {
    return { ok: false, error: "Status tidak valid" };
  }
  const nextStatus = status as PayrollStatus;

  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) {
    return { ok: false, error: "Payroll tidak ditemukan" };
  }

  if (!ALLOWED_TRANSITIONS[payroll.status].includes(nextStatus)) {
    return {
      ok: false,
      error: `Tidak bisa mengubah status dari ${payroll.status} ke ${nextStatus}`,
    };
  }

  await prisma.payroll.update({ where: { id }, data: { status: nextStatus } });

  revalidatePath("/admin/payroll");
  revalidatePath(`/admin/payroll/${id}`);
  return { ok: true };
}
