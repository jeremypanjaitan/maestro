/**
 * Date-string helpers for computing calendar week ranges (Senin–Minggu).
 * All arithmetic happens via UTC-anchored `Date` objects so it matches the
 * `toDbDate`/`formatDbDate` convention in `@/lib/domain/dbDate` and never
 * drifts a day due to local timezone offsets.
 */

function parse(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function format(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Adds (or subtracts, if negative) `days` to a "YYYY-MM-DD" string. */
export function addDays(dateStr: string, days: number): string {
  const date = parse(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return format(date);
}

/** Returns the Monday ("YYYY-MM-DD") of the week containing `dateStr`. */
export function getWeekStart(dateStr: string): string {
  const date = parse(dateStr);
  const dow = date.getUTCDay(); // 0=Sunday..6=Saturday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return format(date);
}

/** Returns today's date as "YYYY-MM-DD" in the server's local time. */
export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
