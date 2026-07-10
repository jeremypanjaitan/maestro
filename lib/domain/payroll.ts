import type { SessionStatus } from '@prisma/client';

import { PAID_STATUSES } from './constants';

export type PayrollSessionInput = { sessionId: string; status: string; rate: number };
export type PayrollComputation = { items: { sessionId: string; rate: number }[]; total: number };

/**
 * Sums the per-session snapshot `rate` (not a single teacher-wide rate) for
 * every session whose status is in PAID_STATUSES (HADIR). Each session
 * carries its own rate because it was snapshotted from the schedule at
 * creation time (classType + rate can vary per enrollment).
 */
export function computePayroll(sessions: PayrollSessionInput[]): PayrollComputation {
  const items = sessions
    .filter((session) => PAID_STATUSES.includes(session.status as SessionStatus))
    .map((session) => ({
      sessionId: session.sessionId,
      rate: session.rate,
    }));

  const total = items.reduce((sum, item) => sum + item.rate, 0);

  return { items, total };
}
