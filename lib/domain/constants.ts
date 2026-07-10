import type { SessionStatus } from '@prisma/client'

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  SCHEDULED: 'Terjadwal',
  HADIR: 'Hadir',
  MURID_TIDAK_HADIR: 'Murid Tidak Hadir',
  GURU_TIDAK_HADIR: 'Guru Tidak Hadir',
  RESCHEDULE: 'Reschedule',
  CANCEL: 'Cancel',
}

export const PAID_STATUSES: SessionStatus[] = ['HADIR']
