import { describe, it, expect } from 'vitest';
import { planSessions, type ScheduleInput } from './generateSessions';

describe('planSessions', () => {
  it('should generate sessions for each matching day of week in date range', () => {
    // 2026-01-05 is a Monday (day 1)
    const from = new Date(2026, 0, 5); // Monday, Jan 5
    const to = new Date(2026, 0, 19); // Monday, Jan 19 (2 weeks later)

    // Verify our dates are Mondays
    expect(from.getDay()).toBe(1); // Monday
    expect(new Date(2026, 0, 12).getDay()).toBe(1); // Next Monday
    expect(to.getDay()).toBe(1); // Monday

    const schedule: ScheduleInput = {
      id: 'sched-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      instrument: 'piano',
      dayOfWeek: 1, // Monday
      startTime: '10:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
      rate: 900000
    };

    const result = planSessions([schedule], from, to, new Set());

    // Should generate 3 Mondays: Jan 5, 12, 19
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      scheduleId: 'sched-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      date: '2026-01-05',
      startTime: '10:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
      rate: 900000
    });
    expect(result[1]).toEqual({
      scheduleId: 'sched-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      date: '2026-01-12',
      startTime: '10:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
      rate: 900000
    });
    expect(result[2]).toEqual({
      scheduleId: 'sched-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      date: '2026-01-19',
      startTime: '10:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
      rate: 900000
    });
  });

  it('should skip sessions that exist in existingKeys (idempotent)', () => {
    const from = new Date(2026, 0, 5); // Monday, Jan 5
    const to = new Date(2026, 0, 19); // Monday, Jan 19

    const schedule: ScheduleInput = {
      id: 'sched-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      instrument: 'piano',
      dayOfWeek: 1, // Monday
      startTime: '10:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
      rate: 900000
    };

    // Skip the session on Jan 12
    const existingKeys = new Set(['sched-1|2026-01-12']);

    const result = planSessions([schedule], from, to, existingKeys);

    // Should generate only 2 sessions (Jan 5 and Jan 19, skipping Jan 12)
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-01-05');
    expect(result[1].date).toBe('2026-01-19');
  });

  it('should carry through startTime, durationMinutes, teacherId, studentId, classType, and rate', () => {
    const from = new Date(2026, 0, 5);
    const to = new Date(2026, 0, 5);

    const schedule: ScheduleInput = {
      id: 'sched-999',
      teacherId: 'teacher-special',
      studentId: 'student-special',
      instrument: 'violin',
      dayOfWeek: 1, // Monday
      startTime: '14:30',
      durationMinutes: 45,
      classType: 'GROUP',
      rate: 500000
    };

    const result = planSessions([schedule], from, to, new Set());

    expect(result).toHaveLength(1);
    const session = result[0];
    expect(session.teacherId).toBe('teacher-special');
    expect(session.studentId).toBe('student-special');
    expect(session.startTime).toBe('14:30');
    expect(session.durationMinutes).toBe(45);
    expect(session.classType).toBe('GROUP');
    expect(session.rate).toBe(500000);
  });

  it('should handle multiple schedules', () => {
    const from = new Date(2026, 0, 5); // Monday
    const to = new Date(2026, 0, 6); // Tuesday

    const schedules: ScheduleInput[] = [
      {
        id: 'sched-mon',
        teacherId: 'teacher-1',
        studentId: 'student-1',
        instrument: 'piano',
        dayOfWeek: 1, // Monday
        startTime: '10:00',
        durationMinutes: 60,
        classType: 'PRIVATE',
        rate: 900000
      },
      {
        id: 'sched-tue',
        teacherId: 'teacher-2',
        studentId: 'student-2',
        instrument: 'guitar',
        dayOfWeek: 2, // Tuesday
        startTime: '15:00',
        durationMinutes: 30,
        classType: 'GROUP',
        rate: 500000
      }
    ];

    const result = planSessions(schedules, from, to, new Set());

    expect(result).toHaveLength(2);
    expect(result[0].scheduleId).toBe('sched-mon');
    expect(result[0].date).toBe('2026-01-05');
    expect(result[0].classType).toBe('PRIVATE');
    expect(result[0].rate).toBe(900000);
    expect(result[1].scheduleId).toBe('sched-tue');
    expect(result[1].date).toBe('2026-01-06');
    expect(result[1].classType).toBe('GROUP');
    expect(result[1].rate).toBe(500000);
  });

  it('should return empty array when no schedules match', () => {
    const from = new Date(2026, 0, 5); // Monday
    const to = new Date(2026, 0, 6); // Tuesday

    const schedule: ScheduleInput = {
      id: 'sched-wed',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      instrument: 'piano',
      dayOfWeek: 3, // Wednesday
      startTime: '10:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
      rate: 900000
    };

    const result = planSessions([schedule], from, to, new Set());

    expect(result).toHaveLength(0);
  });

  it('should format dates as YYYY-MM-DD (local time, not ISO)', () => {
    const from = new Date(2026, 0, 5); // Jan 5 (Monday)
    const to = new Date(2026, 0, 5);

    const schedule: ScheduleInput = {
      id: 'sched-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      instrument: 'piano',
      dayOfWeek: 1,
      startTime: '10:00',
      durationMinutes: 60,
      classType: 'PRIVATE',
      rate: 900000
    };

    const result = planSessions([schedule], from, to, new Set());

    expect(result[0].date).toBe('2026-01-05');
    // Should not be ISO string with timezone offset
    expect(result[0].date).not.toContain('T');
  });
});
