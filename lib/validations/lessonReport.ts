import { z } from "zod";

/** Every text field on a lesson report is optional free text — a guru may
 * save a partial report and fill in the rest later. `grade` is kept short
 * since it's meant for things like "A" or "85", not a paragraph.
 *
 * Blank input is normalized to `null`, not `undefined`. This matters for
 * `upsertLessonReport`'s `update: {...data}`: Prisma treats an `undefined`
 * property as "don't touch this column", so if clearing a field mapped to
 * `undefined`, a guru who erases previously-saved text and saves would see
 * "Laporan tersimpan" while the old value silently survives in the DB.
 * `null` (the column is nullable) makes the clear actually persist. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Maksimum ${max} karakter`)
    .optional()
    .transform((value) => (value ? value : null));
}

export const lessonReportSchema = z.object({
  material: optionalText(2000),
  target: optionalText(2000),
  result: optionalText(2000),
  homework: optionalText(2000),
  grade: optionalText(50),
  notes: optionalText(2000),
});

export type LessonReportInput = z.input<typeof lessonReportSchema>;
export type LessonReportOutput = z.output<typeof lessonReportSchema>;
