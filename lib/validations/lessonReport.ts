import { z } from "zod";

/** Every text field on a lesson report is optional free text — a guru may
 * save a partial report and fill in the rest later. `grade` is kept short
 * since it's meant for things like "A" or "85", not a paragraph. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Maksimum ${max} karakter`)
    .optional()
    .transform((value) => (value ? value : undefined));
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
