import { describe, it, expect } from 'vitest'
import { hasConflict, type Slot } from './conflict'

describe('hasConflict', () => {
  it('detects conflict when same teacher with overlapping times (both PRIVATE)', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '09:30',
        durationMinutes: 60,
        classType: 'PRIVATE',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(true)
  })

  it('detects conflict when same student with overlapping times', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-2',
        studentId: 'student-1',
        startTime: '09:30',
        durationMinutes: 60,
        classType: 'PRIVATE',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(true)
  })

  it('no conflict if different teacher and different student', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-2',
        studentId: 'student-2',
        startTime: '09:30',
        durationMinutes: 60,
        classType: 'PRIVATE',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(false)
  })

  it('no conflict if same teacher but times do not overlap', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '10:00',
        durationMinutes: 60,
        classType: 'PRIVATE',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(false)
  })

  it('no conflict: two GROUP slots, same teacher, overlapping time, different students', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'GROUP',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '09:00',
        durationMinutes: 60,
        classType: 'GROUP',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(false)
  })

  it('conflict: GROUP + PRIVATE same teacher overlapping', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'GROUP',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '09:00',
        durationMinutes: 60,
        classType: 'PRIVATE',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(true)
  })

  it('conflict: PRIVATE + GROUP same teacher overlapping (order swapped)', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '09:00',
        durationMinutes: 60,
        classType: 'GROUP',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(true)
  })

  it('conflict: same student overlapping, even when both are GROUP', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'GROUP',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-2',
        studentId: 'student-1',
        startTime: '09:00',
        durationMinutes: 60,
        classType: 'GROUP',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(true)
  })

  it('no conflict: three-way GROUP class, same teacher + slot, all different students', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-3',
      startTime: '09:00',
      durationMinutes: 60,
      classType: 'GROUP',
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-1',
        startTime: '09:00',
        durationMinutes: 60,
        classType: 'GROUP',
      },
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '09:00',
        durationMinutes: 60,
        classType: 'GROUP',
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(false)
  })
})
