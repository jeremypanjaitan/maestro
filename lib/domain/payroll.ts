import type { SessionStatus } from '@prisma/client';

import { PAID_STATUSES } from './constants';

export type PayrollSessionInput = { sessionId: string; status: string; date: Date };
export type PayrollComputation = { items: { sessionId: string; rate: number }[]; total: number };

export function computePayroll(
  sessions: PayrollSessionInput[],
  ratePerSession: number
): PayrollComputation {
  const items = sessions
    .filter((session) => PAID_STATUSES.includes(session.status as SessionStatus))
    .map((session) => ({
      sessionId: session.sessionId,
      rate: ratePerSession,
    }));

  const total = items.length * ratePerSession;

  return { items, total };
}
