"use server";

import { revalidatePath } from "next/cache";
import type { PayrollStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { assignMeetingNumbers } from "@/lib/domain/meeting";

export type PayrollActionResult = { ok: true } | { ok: false; error: string };

export type GeneratePayrollResult =
  | { ok: true; payrollId: string; total: number; itemCount: number }
  | { ok: false; error: string };

/** Derived per-session payment status — never persisted, always computed
 * from whether/how a HADIR session is referenced by a PayrollItem. */
export type PayStatus = "UNPAID" | "PROCESSING" | "PAID";

export type PayableSession = {
  id: string;
  dateStr: string;
  startTime: string;
  studentName: string;
  rate: number;
  meetingNumber: number | null;
  payStatus: PayStatus;
  /** True if this session's PayrollItem belongs to the payroll for exactly
   * this (teacherId, month, year) period — used to pre-check the row in the
   * selection UI when regenerating an existing DRAFT/APPROVED payroll. */
  inThisPayroll: boolean;
};

export type GetPayableSessionsResult =
  | { ok: true; sessions: PayableSession[] }
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

/** Shared month/year validation used by both `getPayableSessions` and
 * `generatePayroll`. Returns an error string, or null if valid. */
function validatePeriod(month: number, year: number): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return "Bulan tidak valid";
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return "Tahun tidak valid";
  }
  return null;
}

/**
 * Lists a teacher's HADIR sessions within a month, each annotated with its
 * derived pay status (UNPAID / PROCESSING / PAID, based on whether/how a
 * PayrollItem references it — see `PayStatus`) and its "pertemuan ke-N"
 * meeting number. Used to render the meeting-selection checklist in the
 * generate-payroll dialog.
 */
export async function getPayableSessions(
  teacherId: string,
  month: number,
  year: number,
): Promise<GetPayableSessionsResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const periodError = validatePeriod(month, year);
  if (periodError) {
    return { ok: false, error: periodError };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) {
    return { ok: false, error: "Guru tidak ditemukan" };
  }

  // Month boundaries in UTC, matching how `date @db.Date` columns are stored
  // (see `lib/domain/dbDate.ts`).
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));

  // Meeting numbers ("pertemuan ke-N") must be computed against the
  // teacher's FULL session history, not just this period's sessions —
  // mirrors `getMeetingNumbersForTeacher` in `lib/queries/payroll.ts`.
  const allSessions = await prisma.session.findMany({
    where: { teacherId },
    select: {
      id: true,
      studentId: true,
      teacherId: true,
      date: true,
      startTime: true,
      status: true,
    },
  });
  const meetingNumbers = assignMeetingNumbers(
    allSessions.map((s) => ({
      sessionId: s.id,
      studentId: s.studentId,
      teacherId: s.teacherId,
      date: formatDbDate(s.date),
      startTime: s.startTime,
      status: s.status,
    })),
  );

  const periodSessions = await prisma.session.findMany({
    where: {
      teacherId,
      status: "HADIR",
      date: { gte: periodStart, lte: periodEnd },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      rate: true,
      student: { select: { name: true } },
      payrollItem: {
        select: {
          payroll: {
            select: { teacherId: true, periodMonth: true, periodYear: true, status: true },
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const sessions: PayableSession[] = periodSessions.map((s) => {
    let payStatus: PayStatus = "UNPAID";
    let inThisPayroll = false;

    if (s.payrollItem) {
      const owner = s.payrollItem.payroll;
      payStatus = owner.status === "PAID" ? "PAID" : "PROCESSING";
      inThisPayroll =
        owner.teacherId === teacherId &&
        owner.periodMonth === month &&
        owner.periodYear === year;
    }

    return {
      id: s.id,
      dateStr: formatDbDate(s.date),
      startTime: s.startTime,
      studentName: s.student.name,
      rate: s.rate,
      meetingNumber: meetingNumbers.get(s.id) ?? null,
      payStatus,
      inThisPayroll,
    };
  });

  return { ok: true, sessions };
}

/**
 * (Re)generates a teacher's payroll for a given month/year from an
 * admin-selected subset of their HADIR sessions in that period: sums the
 * per-session `rate` snapshot (classType + rate captured at session-creation
 * time, NOT a single teacher-wide rate) over `sessionIds`, and upserts a
 * Payroll + its PayrollItems. Idempotent — calling it again for the same
 * period replaces the items rather than duplicating them, and resets the
 * status to DRAFT (unless the existing payroll is already PAID, in which
 * case it refuses).
 *
 * `sessionIds` is validated against two constraints, both enforced by
 * filtering (an ineligible id is silently dropped rather than failing the
 * whole call, so a stale client-side selection can't block a legitimate
 * generate):
 *  - must be one of the teacher's HADIR sessions within the period;
 *  - must be unclaimed by any payroll, or already claimed by THIS period's
 *    payroll — a session can never be stolen from a different payroll,
 *    since `PayrollItem.sessionId` is globally unique.
 */
export async function generatePayroll(
  teacherId: string,
  month: number,
  year: number,
  sessionIds: string[],
): Promise<GeneratePayrollResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const periodError = validatePeriod(month, year);
  if (periodError) {
    return { ok: false, error: periodError };
  }

  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return { ok: false, error: "Pilih minimal satu pertemuan" };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true },
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

  /** Prisma's transaction-scoped client type, used so `fetchEligible` can
   * run against either the plain client or the tx. */
  type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

  /** Re-fetches the candidate sessions and filters them down to the ones
   * eligible to be claimed by `ownerPayrollId` (the current payroll for this
   * period, if any): must be this teacher's HADIR sessions within the
   * period, and unclaimed or already claimed by `ownerPayrollId`. */
  async function fetchEligible(client: typeof prisma | PrismaTx, ownerPayrollId: string | undefined) {
    const candidates = await client.session.findMany({
      where: {
        id: { in: sessionIds },
        teacherId,
        status: "HADIR",
        date: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true, rate: true, payrollItem: { select: { payrollId: true } } },
    });
    return candidates.filter(
      (s) => !s.payrollItem || s.payrollItem.payrollId === ownerPayrollId,
    );
  }

  let payroll;
  let finalItemCount = 0;
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

      // Authoritative eligibility check, run inside the transaction against
      // whatever the current payroll for this period actually is: a
      // session is eligible only if it's unclaimed or already claimed by
      // `current` (this period's own payroll) — it can never be stolen
      // from a different payroll (see `PayrollItem.sessionId`'s global
      // unique constraint).
      const eligible = await fetchEligible(tx, current?.id);
      const total = eligible.reduce((sum, s) => sum + s.rate, 0);

      if (current) {
        // Delete before recreating so the globally-unique
        // `PayrollItem.sessionId` never collides with itself.
        await tx.payrollItem.deleteMany({ where: { payrollId: current.id } });
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

      if (eligible.length > 0) {
        await tx.payrollItem.createMany({
          data: eligible.map((s) => ({
            payrollId: record.id,
            sessionId: s.id,
            rate: s.rate,
          })),
        });
      }

      finalItemCount = eligible.length;
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
  return { ok: true, payrollId: payroll.id, total: payroll.total, itemCount: finalItemCount };
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
