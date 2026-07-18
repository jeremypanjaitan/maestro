import type { ClassType, SessionStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";

/** One session row in the "status sesi" table, annotated with whether it has
 * been paid and (if so) which payment covers it. */
export type HonorSessionRow = {
  id: string;
  dateStr: string;
  startTime: string;
  studentId: string;
  studentName: string;
  classType: ClassType;
  status: SessionStatus;
  rate: number;
  paid: boolean;
  paymentId: string | null;
};

/** One row in the payment-history table. */
export type HonorPaymentRow = {
  id: string;
  paidAtStr: string;
  amount: number;
  itemCount: number;
  proofCount: number;
  note: string | null;
};

export type AdminHonorData = {
  teachers: { id: string; name: string }[];
  selectedTeacherId: string | null;
  sessions: HonorSessionRow[];
  payments: HonorPaymentRow[];
};

/** Maps a teacher's sessions (with their honorPaymentItem relation preloaded)
 * into `HonorSessionRow`s, newest first. Shared by admin + guru queries. */
async function loadSessionRows(teacherId: string): Promise<HonorSessionRow[]> {
  const sessions = await prisma.session.findMany({
    where: { teacherId },
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
    select: {
      id: true,
      date: true,
      startTime: true,
      classType: true,
      status: true,
      rate: true,
      student: { select: { id: true, name: true } },
      honorPaymentItem: { select: { honorPaymentId: true } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    dateStr: formatDbDate(s.date),
    startTime: s.startTime,
    studentId: s.student.id,
    studentName: s.student.name,
    classType: s.classType,
    status: s.status,
    rate: s.rate,
    paid: s.honorPaymentItem !== null,
    paymentId: s.honorPaymentItem?.honorPaymentId ?? null,
  }));
}

/** Loads a teacher's payment history, newest first. */
async function loadPaymentRows(teacherId: string): Promise<HonorPaymentRow[]> {
  const payments = await prisma.honorPayment.findMany({
    where: { teacherId },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      paidAt: true,
      amount: true,
      note: true,
      _count: { select: { items: true, proofs: true } },
    },
  });

  return payments.map((p) => ({
    id: p.id,
    paidAtStr: formatDbDate(p.paidAt),
    amount: p.amount,
    itemCount: p._count.items,
    proofCount: p._count.proofs,
    note: p.note,
  }));
}

/**
 * Data for the admin "Pembayaran Honor" page: the teacher selector plus (when
 * a teacher is selected) that teacher's session-payment status and payment
 * history. Admin-only — callers render behind the `app/admin` layout guard.
 */
export async function getAdminHonorData(
  teacherId?: string,
): Promise<AdminHonorData> {
  const teachers = await prisma.teacher.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selected =
    teacherId && teachers.some((t) => t.id === teacherId) ? teacherId : null;

  if (!selected) {
    return { teachers, selectedTeacherId: null, sessions: [], payments: [] };
  }

  const [sessions, payments] = await Promise.all([
    loadSessionRows(selected),
    loadPaymentRows(selected),
  ]);

  return { teachers, selectedTeacherId: selected, sessions, payments };
}

export type HonorPaymentProofView = {
  id: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
};

export type HonorPaymentDetail = {
  id: string;
  teacherName: string;
  paidAtStr: string;
  amount: number;
  note: string | null;
  items: {
    sessionId: string;
    dateStr: string;
    startTime: string;
    studentName: string;
    status: SessionStatus;
    rateSnapshot: number;
  }[];
  proofs: HonorPaymentProofView[];
};

/**
 * Full detail of one honor payment — covered sessions and proof files.
 * Returns null if not found. Admin-only.
 */
export async function getHonorPayment(
  id: string,
): Promise<HonorPaymentDetail | null> {
  const payment = await prisma.honorPayment.findUnique({
    where: { id },
    select: {
      id: true,
      paidAt: true,
      amount: true,
      note: true,
      teacher: { select: { name: true } },
      items: {
        select: {
          sessionId: true,
          rateSnapshot: true,
          session: {
            select: {
              date: true,
              startTime: true,
              status: true,
              student: { select: { name: true } },
            },
          },
        },
      },
      proofs: {
        select: { id: true, filename: true, mimeType: true, dataBase64: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!payment) return null;

  const items = payment.items
    .map((it) => ({
      sessionId: it.sessionId,
      dateStr: formatDbDate(it.session.date),
      startTime: it.session.startTime,
      studentName: it.session.student.name,
      status: it.session.status,
      rateSnapshot: it.rateSnapshot,
    }))
    .sort((a, b) =>
      a.dateStr === b.dateStr
        ? a.startTime.localeCompare(b.startTime)
        : a.dateStr.localeCompare(b.dateStr),
    );

  return {
    id: payment.id,
    teacherName: payment.teacher.name,
    paidAtStr: formatDbDate(payment.paidAt),
    amount: payment.amount,
    note: payment.note,
    items,
    proofs: payment.proofs,
  };
}

export type GuruHonorData = {
  sessions: HonorSessionRow[];
  payments: HonorPaymentRow[];
};

/**
 * Read-only honor data for the signed-in guru: their own session-payment
 * status and payment history. teacherId is re-derived from `auth()`, never
 * trusted from the caller. Returns empty lists if the guru account isn't
 * linked to a Teacher record.
 */
export async function getGuruHonorData(): Promise<GuruHonorData> {
  const session = await auth();
  const teacherId = session?.user?.teacherId;
  if (session?.user?.role !== "GURU" || !teacherId) {
    return { sessions: [], payments: [] };
  }

  const [sessions, payments] = await Promise.all([
    loadSessionRows(teacherId),
    loadPaymentRows(teacherId),
  ]);
  return { sessions, payments };
}

/**
 * Proofs for one payment, scoped to the signed-in guru (they may only view
 * proofs on their own payments). Returns null if not found or not theirs.
 */
export async function getGuruPaymentProofs(
  paymentId: string,
): Promise<{ paidAtStr: string; amount: number; proofs: HonorPaymentProofView[] } | null> {
  const session = await auth();
  const teacherId = session?.user?.teacherId;
  if (session?.user?.role !== "GURU" || !teacherId) return null;

  const payment = await prisma.honorPayment.findFirst({
    where: { id: paymentId, teacherId },
    select: {
      paidAt: true,
      amount: true,
      proofs: {
        select: { id: true, filename: true, mimeType: true, dataBase64: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!payment) return null;
  return {
    paidAtStr: formatDbDate(payment.paidAt),
    amount: payment.amount,
    proofs: payment.proofs,
  };
}
