import { rangesOverlap } from '@/lib/domain/time'

export type Slot = {
  teacherId: string
  studentId: string
  startTime: string
  durationMinutes: number
}

export function hasConflict(candidate: Slot, existing: Slot[]): boolean {
  return existing.some((slot) => {
    const sameTeacher = candidate.teacherId === slot.teacherId
    const sameStudent = candidate.studentId === slot.studentId
    const timesOverlap = rangesOverlap(
      candidate.startTime,
      candidate.durationMinutes,
      slot.startTime,
      slot.durationMinutes
    )

    return (sameTeacher || sameStudent) && timesOverlap
  })
}
