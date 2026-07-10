import { describe, it, expect } from 'vitest'
import { assignMeetingNumbers, type MeetingSessionInput } from './meeting'

describe('assignMeetingNumbers', () => {
  it('numbers a single pair sequence 1..N by (date, startTime)', () => {
    const sessions: MeetingSessionInput[] = [
      { sessionId: 's1', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-05', startTime: '10:00', status: 'HADIR' },
      { sessionId: 's2', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-12', startTime: '10:00', status: 'HADIR' },
      { sessionId: 's3', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-19', startTime: '10:00', status: 'SCHEDULED' },
    ]
    const result = assignMeetingNumbers(sessions)
    expect(result.get('s1')).toBe(1)
    expect(result.get('s2')).toBe(2)
    expect(result.get('s3')).toBe(3)
  })

  it('sorts out-of-order input by date then startTime before numbering', () => {
    const sessions: MeetingSessionInput[] = [
      { sessionId: 's3', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-19', startTime: '09:00', status: 'HADIR' },
      { sessionId: 's1', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-05', startTime: '11:00', status: 'HADIR' },
      { sessionId: 's2', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-05', startTime: '09:00', status: 'HADIR' },
    ]
    const result = assignMeetingNumbers(sessions)
    // Same date as s1 but earlier startTime -> comes first
    expect(result.get('s2')).toBe(1)
    expect(result.get('s1')).toBe(2)
    expect(result.get('s3')).toBe(3)
  })

  it('excludes RESCHEDULE and CANCEL sessions from the map and does not let them consume a number', () => {
    const sessions: MeetingSessionInput[] = [
      { sessionId: 's1', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-05', startTime: '10:00', status: 'HADIR' },
      { sessionId: 's2', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-12', startTime: '10:00', status: 'RESCHEDULE' },
      { sessionId: 's3', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-19', startTime: '10:00', status: 'HADIR' },
      { sessionId: 's4', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-26', startTime: '10:00', status: 'CANCEL' },
      { sessionId: 's5', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-02-02', startTime: '10:00', status: 'HADIR' },
    ]
    const result = assignMeetingNumbers(sessions)
    expect(result.has('s2')).toBe(false)
    expect(result.has('s4')).toBe(false)
    expect(result.get('s1')).toBe(1)
    expect(result.get('s3')).toBe(2)
    expect(result.get('s5')).toBe(3)
  })

  it('numbers independently per (studentId, teacherId) pair', () => {
    const sessions: MeetingSessionInput[] = [
      { sessionId: 's1', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-05', startTime: '10:00', status: 'HADIR' },
      { sessionId: 's2', studentId: 'stu-2', teacherId: 'tea-1', date: '2026-01-05', startTime: '11:00', status: 'HADIR' },
      { sessionId: 's3', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-12', startTime: '10:00', status: 'HADIR' },
      { sessionId: 's4', studentId: 'stu-1', teacherId: 'tea-2', date: '2026-01-06', startTime: '10:00', status: 'HADIR' },
    ]
    const result = assignMeetingNumbers(sessions)
    // stu-1/tea-1 pair: s1, s3
    expect(result.get('s1')).toBe(1)
    expect(result.get('s3')).toBe(2)
    // stu-2/tea-1 pair: independent, starts at 1
    expect(result.get('s2')).toBe(1)
    // stu-1/tea-2 pair: independent, starts at 1
    expect(result.get('s4')).toBe(1)
  })

  it('returns an empty map for an empty input', () => {
    const result = assignMeetingNumbers([])
    expect(result.size).toBe(0)
  })

  it('returns an empty map when every session in a pair is RESCHEDULE/CANCEL', () => {
    const sessions: MeetingSessionInput[] = [
      { sessionId: 's1', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-05', startTime: '10:00', status: 'RESCHEDULE' },
      { sessionId: 's2', studentId: 'stu-1', teacherId: 'tea-1', date: '2026-01-12', startTime: '10:00', status: 'CANCEL' },
    ]
    const result = assignMeetingNumbers(sessions)
    expect(result.size).toBe(0)
  })
})
