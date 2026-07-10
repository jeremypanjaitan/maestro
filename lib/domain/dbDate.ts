/**
 * Converts a "YYYY-MM-DD" string into the Date value that must be written to
 * (or compared against) a `@db.Date` Prisma column.
 *
 * Postgres `DATE` columns are timezone-less, but Prisma still round-trips
 * them through JS `Date` objects using their *UTC* fields. In a positive-UTC
 * -offset timezone (e.g. WIB, UTC+7), a locally-constructed midnight
 * (`new Date(y, m-1, d)`) is actually 17:00 UTC on the *previous* day, so
 * writing it lands the row on the wrong date. Constructing at UTC midnight
 * instead round-trips exactly. (Verified empirically against this project's
 * dev database — see task-14 report.)
 */
export function toDbDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a `@db.Date` column value back to "YYYY-MM-DD" using UTC getters,
 * the mirror image of `toDbDate`. */
export function formatDbDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
