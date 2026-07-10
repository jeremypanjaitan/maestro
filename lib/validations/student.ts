import { z } from "zod";

/** Known instruments offered by the school. Used to build the select in the student form.
 * Free text is also accepted, so this is a suggestion list rather than a hard enum. */
export const INSTRUMENTS = [
  "Piano",
  "Guitar",
  "Drum",
  "Violin",
  "Saxophone",
  "Vocal",
] as const;

/** Suggested proficiency levels. Free text is also accepted. */
export const LEVELS = ["Pemula", "Menengah", "Mahir"] as const;

const name = z.string().trim().min(1, "Nama wajib diisi");

const parentName = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const contact = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const instrument = z.string().trim().min(1, "Instrumen wajib diisi");

const level = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const learningTarget = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const status = z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE");

/** Schema for creating or updating a student. Student has no linked User account. */
export const studentSchema = z.object({
  name,
  parentName,
  contact,
  instrument,
  level,
  learningTarget,
  status,
});

export const createStudentSchema = studentSchema;
export const updateStudentSchema = studentSchema;

export type CreateStudentInput = z.input<typeof createStudentSchema>;
export type UpdateStudentInput = z.input<typeof updateStudentSchema>;
