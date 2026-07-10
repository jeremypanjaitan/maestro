import { describe, it, expect } from 'vitest'
import { hasConflict, type Slot } from './conflict'

describe('hasConflict', () => {
  it('detects conflict when same teacher with overlapping times', () => {
    const candidate: Slot = {
      teacherId: 'teacher-1',
      studentId: 'student-1',
      startTime: '09:00',
      durationMinutes: 60,
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '09:30',
        durationMinutes: 60,
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
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-2',
        studentId: 'student-1',
        startTime: '09:30',
        durationMinutes: 60,
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
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-2',
        studentId: 'student-2',
        startTime: '09:30',
        durationMinutes: 60,
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
    }
    const existing: Slot[] = [
      {
        teacherId: 'teacher-1',
        studentId: 'student-2',
        startTime: '10:00',
        durationMinutes: 60,
      },
    ]
    expect(hasConflict(candidate, existing)).toBe(false)
  })
})
