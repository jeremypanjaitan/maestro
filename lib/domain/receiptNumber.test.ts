import { describe, it, expect } from 'vitest';
import { formatReceiptNumber, nextReceiptSeq, receiptNumberPrefix } from './receiptNumber';

describe('receiptNumber', () => {
  it('pads month and sequence', () => {
    expect(formatReceiptNumber(2026, 9, 1)).toBe('KW/RM/2026/09/001');
    expect(formatReceiptNumber(2026, 10, 123)).toBe('KW/RM/2026/10/123');
  });

  it('prefix matches formatted numbers', () => {
    expect(formatReceiptNumber(2026, 10, 7).startsWith(receiptNumberPrefix(2026, 10))).toBe(true);
  });

  it('next seq is max + 1 (gaps from deletions are not reused)', () => {
    expect(nextReceiptSeq([])).toBe(1);
    expect(nextReceiptSeq(['KW/RM/2026/10/001', 'KW/RM/2026/10/003'])).toBe(4);
  });
});
