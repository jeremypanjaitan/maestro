import { describe, it, expect } from 'vitest';
import { computePayroll, PayrollSessionInput, PayrollComputation } from './payroll';

describe('computePayroll', () => {
  it('should return empty items and total 0 when given empty array', () => {
    const result = computePayroll([], 100000);
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('should only include sessions with HADIR status', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', date: new Date() },
      { sessionId: '2', status: 'HADIR', date: new Date() },
      { sessionId: '3', status: 'MURID_TIDAK_HADIR', date: new Date() },
    ];
    const result = computePayroll(sessions, 100000);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].sessionId).toBe('1');
    expect(result.items[1].sessionId).toBe('2');
  });

  it('should set rate to ratePerSession for each item', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', date: new Date() },
      { sessionId: '2', status: 'HADIR', date: new Date() },
    ];
    const ratePerSession = 150000;
    const result = computePayroll(sessions, ratePerSession);
    expect(result.items[0].rate).toBe(150000);
    expect(result.items[1].rate).toBe(150000);
  });

  it('should calculate total as items.length * ratePerSession', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', date: new Date() },
      { sessionId: '2', status: 'HADIR', date: new Date() },
      { sessionId: '3', status: 'HADIR', date: new Date() },
    ];
    const ratePerSession = 100000;
    const result = computePayroll(sessions, ratePerSession);
    expect(result.total).toBe(300000);
  });

  it('should handle mixed statuses correctly', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', date: new Date() },
      { sessionId: '2', status: 'CANCEL', date: new Date() },
      { sessionId: '3', status: 'HADIR', date: new Date() },
      { sessionId: '4', status: 'GURU_TIDAK_HADIR', date: new Date() },
      { sessionId: '5', status: 'HADIR', date: new Date() },
    ];
    const ratePerSession = 50000;
    const result = computePayroll(sessions, ratePerSession);
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(150000);
  });

  it('should exclude sessions with various non-HADIR statuses', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'MURID_TIDAK_HADIR', date: new Date() },
      { sessionId: '2', status: 'CANCEL', date: new Date() },
      { sessionId: '3', status: 'GURU_TIDAK_HADIR', date: new Date() },
      { sessionId: '4', status: 'RESCHEDULE', date: new Date() },
      { sessionId: '5', status: 'SCHEDULED', date: new Date() },
    ];
    const result = computePayroll(sessions, 100000);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should return empty items and total 0 when no HADIR sessions exist', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'CANCEL', date: new Date() },
      { sessionId: '2', status: 'SCHEDULED', date: new Date() },
    ];
    const result = computePayroll(sessions, 100000);
    expect(result).toEqual({ items: [], total: 0 });
  });
});
