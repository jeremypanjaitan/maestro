import { describe, it, expect } from 'vitest';
import { computePayroll, PayrollSessionInput, PayrollComputation } from './payroll';

describe('computePayroll', () => {
  it('should return empty items and total 0 when given empty array', () => {
    const result: PayrollComputation = computePayroll([]);
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('should only include sessions with HADIR status', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', rate: 100000 },
      { sessionId: '2', status: 'HADIR', rate: 100000 },
      { sessionId: '3', status: 'MURID_TIDAK_HADIR', rate: 100000 },
    ];
    const result = computePayroll(sessions);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].sessionId).toBe('1');
    expect(result.items[1].sessionId).toBe('2');
  });

  it('should set item.rate to the session own snapshot rate', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', rate: 150000 },
      { sessionId: '2', status: 'HADIR', rate: 150000 },
    ];
    const result = computePayroll(sessions);
    expect(result.items[0].rate).toBe(150000);
    expect(result.items[1].rate).toBe(150000);
  });

  it('should sum varied per-session rates rather than count * single rate', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', rate: 900000 }, // private
      { sessionId: '2', status: 'HADIR', rate: 450000 }, // discounted private
      { sessionId: '3', status: 'HADIR', rate: 500000 }, // group
    ];
    const result = computePayroll(sessions);
    expect(result.total).toBe(1850000);
  });

  it('should calculate total as the sum of item rates', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', rate: 100000 },
      { sessionId: '2', status: 'HADIR', rate: 100000 },
      { sessionId: '3', status: 'HADIR', rate: 100000 },
    ];
    const result = computePayroll(sessions);
    expect(result.total).toBe(300000);
  });

  it('should handle mixed statuses correctly, summing only HADIR rates', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'HADIR', rate: 50000 },
      { sessionId: '2', status: 'CANCEL', rate: 999999 },
      { sessionId: '3', status: 'HADIR', rate: 50000 },
      { sessionId: '4', status: 'GURU_TIDAK_HADIR', rate: 999999 },
      { sessionId: '5', status: 'HADIR', rate: 50000 },
    ];
    const result = computePayroll(sessions);
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(150000);
  });

  it('should exclude sessions with various non-HADIR statuses', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'MURID_TIDAK_HADIR', rate: 100000 },
      { sessionId: '2', status: 'CANCEL', rate: 100000 },
      { sessionId: '3', status: 'GURU_TIDAK_HADIR', rate: 100000 },
      { sessionId: '4', status: 'RESCHEDULE', rate: 100000 },
      { sessionId: '5', status: 'SCHEDULED', rate: 100000 },
    ];
    const result = computePayroll(sessions);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should return empty items and total 0 when no HADIR sessions exist', () => {
    const sessions: PayrollSessionInput[] = [
      { sessionId: '1', status: 'CANCEL', rate: 100000 },
      { sessionId: '2', status: 'SCHEDULED', rate: 100000 },
    ];
    const result = computePayroll(sessions);
    expect(result).toEqual({ items: [], total: 0 });
  });
});
