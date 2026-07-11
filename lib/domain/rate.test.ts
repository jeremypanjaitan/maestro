import { describe, it, expect } from 'vitest';
import { perSessionRate } from './rate';

describe('perSessionRate', () => {
  it('divides evenly: 900000 / 4 -> 225000', () => {
    expect(perSessionRate(900000, 4)).toBe(225000);
  });

  it('rounds to nearest integer: 1000000 / 3 -> 333333', () => {
    expect(perSessionRate(1000000, 3)).toBe(333333);
  });

  it('rounds up when the remainder is >= .5', () => {
    // 500000 / 3 = 166666.66... -> rounds to 166667
    expect(perSessionRate(500000, 3)).toBe(166667);
  });

  it('returns 0 when packageSessions is 0', () => {
    expect(perSessionRate(900000, 0)).toBe(0);
  });

  it('returns 0 when packageSessions is negative', () => {
    expect(perSessionRate(900000, -1)).toBe(0);
  });

  it('returns 0 when packagePrice is 0', () => {
    expect(perSessionRate(0, 4)).toBe(0);
  });
});
