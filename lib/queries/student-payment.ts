import type { SessionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { NON_HONOR_STATUSES } from "@/lib/domain/constants";
import { assignMeetingNumbers } from "@/lib/domain/meeting";

/** A billable session of the student not yet covered by any payment. */
export type UnpaidStudentSession = {
  id: string;
  dateStr: string;
  startTime: string;
  teacherName: string;
  status: SessionStatus;
  rate: number;
};

export type StudentPaymentRow = {
  id: string;
  number: string;
  paidAtStr: string;
  amount: number;
  itemCount: number;
  creditCount: number;
  note: string | null;
};

/** A paid-for item sitting on a CANCEL session — waiting to be moved. */
export type StudentPaymentCredit = {
  itemId: string;
  paymentNumber: string;
  dateStr: string;
  startTime: string;
  teacherName: string;
  rateSnapshot: number;
};

export type AdminStudentPaymentData = {
  students: { id: string; name: string }[];
  selectedStudentId: string | null;
  payments: StudentPaymentRow[];
  unpaidSessions: UnpaidStudentSession[];
  credits: StudentPaymentCredit[];
};

/**
 * Data for the admin "Pembayaran Murid" page: the student selector plus (when
 * a student is selected) their payment history, unpaid billable sessions
 * (past and future — for bayar di akhir and bayar di awal), and credits.
 */
export async function getAdminStudentPaymentData(
  studentId?: string,
): Promise<AdminStudentPaymentData> {
  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selected =
    studentId && students.some((s) => s.id === studentId) ? studentId : null;
  if (!selected) {
    return {
      students,
      selectedStudentId: null,
      payments: [],
      unpaidSessions: [],
      credits: [],
    };
  }

  const [payments, unpaid, credits] = await Promise.all([
    prisma.studentPayment.findMany({
      where: { studentId: selected },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        number: true,
        paidAt: true,
        amount: true,
        note: true,
        items: { select: { session: { select: { status: true } } } },
      },
    }),
    prisma.session.findMany({
      where: {
        studentId: selected,
        status: { notIn: NON_HONOR_STATUSES },
        studentPaymentItem: { is: null },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        rate: true,
        teacher: { select: { name: true } },
      },
    }),
    prisma.studentPaymentItem.findMany({
      where: {
        studentPayment: { studentId: selected },
        session: { status: "CANCEL" },
      },
      orderBy: { session: { date: "asc" } },
      select: {
        id: true,
        rateSnapshot: true,
        studentPayment: { select: { number: true } },
        session: {
          select: { date: true, startTime: true, teacher: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    students,
    selectedStudentId: selected,
    payments: payments.map((p) => ({
      id: p.id,
      number: p.number,
      paidAtStr: formatDbDate(p.paidAt),
      amount: p.amount,
      itemCount: p.items.length,
      creditCount: p.items.filter((it) => it.session.status === "CANCEL").length,
      note: p.note,
    })),
    unpaidSessions: unpaid.map((s) => ({
      id: s.id,
      dateStr: formatDbDate(s.date),
      startTime: s.startTime,
      teacherName: s.teacher.name,
      status: s.status,
      rate: s.rate,
    })),
    credits: credits.map((c) => ({
      itemId: c.id,
      paymentNumber: c.studentPayment.number,
      dateStr: formatDbDate(c.session.date),
      startTime: c.session.startTime,
      teacherName: c.session.teacher.name,
      rateSnapshot: c.rateSnapshot,
    })),
  };
}

export type StudentPaymentDetailItem = {
  sessionId: string;
  dateStr: string;
  startTime: string;
  durationMinutes: number;
  teacherName: string;
  status: SessionStatus;
  rateSnapshot: number;
  /** "Pertemuan ke-N" for this student/teacher pair, null for CANCEL. */
  meetingNumber: number | null;
  /** Original date when this session replaced a rescheduled one. */
  rescheduledFromDateStr: string | null;
};

export type StudentPaymentDetail = {
  id: string;
  number: string;
  studentId: string;
  studentName: string;
  studentInstrument: string;
  paidAtStr: string;
  amount: number;
  note: string | null;
  items: StudentPaymentDetailItem[];
};

/**
 * Full detail of one student payment — used by the detail page AND the
 * kwitansi PDF so both show identical rows. Meeting numbers are computed
 * against the student's full session history (`assignMeetingNumbers`).
 * Returns null if not found. Admin-only.
 */
export async function getStudentPayment(
  id: string,
): Promise<StudentPaymentDetail | null> {
  const payment = await prisma.studentPayment.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      paidAt: true,
      amount: true,
      note: true,
      student: { select: { id: true, name: true, instrument: true } },
      items: {
        select: {
          sessionId: true,
          rateSnapshot: true,
          session: {
            select: {
              date: true,
              startTime: true,
              durationMinutes: true,
              status: true,
              teacher: { select: { name: true } },
              rescheduledFrom: { select: { date: true } },
            },
          },
        },
      },
    },
  });
  if (!payment) return null;

  const history = await prisma.session.findMany({
    where: { studentId: payment.student.id },
    select: { id: true, studentId: true, teacherId: true, date: true, startTime: true, status: true },
  });
  const meetingNumbers = assignMeetingNumbers(
    history.map((s) => ({
      sessionId: s.id,
      studentId: s.studentId,
      teacherId: s.teacherId,
      date: formatDbDate(s.date),
      startTime: s.startTime,
      status: s.status,
    })),
  );

  const items = payment.items
    .map((it) => ({
      sessionId: it.sessionId,
      dateStr: formatDbDate(it.session.date),
      startTime: it.session.startTime,
      durationMinutes: it.session.durationMinutes,
      teacherName: it.session.teacher.name,
      status: it.session.status,
      rateSnapshot: it.rateSnapshot,
      meetingNumber: meetingNumbers.get(it.sessionId) ?? null,
      rescheduledFromDateStr: it.session.rescheduledFrom
        ? formatDbDate(it.session.rescheduledFrom.date)
        : null,
    }))
    .sort((a, b) =>
      a.dateStr === b.dateStr
        ? a.startTime.localeCompare(b.startTime)
        : a.dateStr.localeCompare(b.dateStr),
    );

  return {
    id: payment.id,
    number: payment.number,
    studentId: payment.student.id,
    studentName: payment.student.name,
    studentInstrument: payment.student.instrument,
    paidAtStr: formatDbDate(payment.paidAt),
    amount: payment.amount,
    note: payment.note,
    items,
  };
}
