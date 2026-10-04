/** Kwitansi number, e.g. `KW/RM/2026/10/001` — sequence is per month. */
export function formatReceiptNumber(year: number, month: number, seq: number): string {
  return `KW/RM/${year}/${String(month).padStart(2, "0")}/${String(seq).padStart(3, "0")}`;
}

/** Prefix shared by every number in one month, for counting/lookup. */
export function receiptNumberPrefix(year: number, month: number): string {
  return `KW/RM/${year}/${String(month).padStart(2, "0")}/`;
}

/** Next sequence for a month given the numbers already issued in it. */
export function nextReceiptSeq(existing: string[]): number {
  let max = 0;
  for (const n of existing) {
    const seq = Number(n.slice(n.lastIndexOf("/") + 1));
    if (Number.isInteger(seq) && seq > max) max = seq;
  }
  return max + 1;
}
