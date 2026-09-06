import type { ClassType, PayrollStatus, SessionStatus } from '@prisma/client'

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  SCHEDULED: 'Terjadwal',
  HADIR: 'Hadir',
  MURID_TIDAK_HADIR: 'Murid Tidak Hadir',
  GURU_TIDAK_HADIR: 'Guru Tidak Hadir',
  RESCHEDULE: 'Reschedule',
  CANCEL: 'Cancel',
}

export const PAID_STATUSES: SessionStatus[] = ['HADIR']

/**
 * Statuses that carry no honor at all: they never show up in the "Status
 * Sesi" table and can never be selected for (or claimed by) an honor
 * payment. RESCHEDULE means the meeting was moved — the replacement session
 * is the one that gets paid — so paying for both would double-count it.
 */
export const NON_HONOR_STATUSES: SessionStatus[] = ['CANCEL', 'RESCHEDULE']

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: 'Draft',
  APPROVED: 'Disetujui',
  PAID: 'Dibayar',
}

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  PRIVATE: 'Privat',
  GROUP: 'Grup',
}
