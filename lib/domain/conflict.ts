import { rangesOverlap } from '@/lib/domain/time'

export type Slot = {
  teacherId: string
  studentId: string
  startTime: string
  durationMinutes: number
  classType: 'PRIVATE' | 'GROUP'
}

/**
 * A GROUP class is multiple students with the same teacher at the same time
 * slot, each with their own enrollment/session — the teacher is paid per
 * attending student. So two GROUP slots for the same teacher at overlapping
 * times are NOT a conflict (that's one group class). Everything else that
 * overlaps still conflicts:
 *   - any same-student overlap (regardless of classType)
 *   - same-teacher overlap where at least one side isn't GROUP (a PRIVATE
 *     session can never overlap anything else for that teacher)
 */
export function hasConflict(candidate: Slot, existing: Slot[]): boolean {
  return existing.some((slot) => {
    const timesOverlap = rangesOverlap(
      candidate.startTime,
      candidate.durationMinutes,
      slot.startTime,
      slot.durationMinutes
    )
    if (!timesOverlap) return false

    const studentConflict = candidate.studentId === slot.studentId
    const bothGroup = candidate.classType === 'GROUP' && slot.classType === 'GROUP'
    const teacherConflict = candidate.teacherId === slot.teacherId && !bothGroup

    return studentConflict || teacherConflict
  })
}
