import { z } from "zod";

/** Known instruments offered by the school. Used to build the checkbox group in the teacher form. */
export const INSTRUMENTS = [
  "Piano",
  "Guitar",
  "Drum",
  "Violin",
  "Saxophone",
  "Vocal",
] as const;

const name = z.string().trim().min(1, "Nama wajib diisi");

const instruments = z
  .array(z.string().trim().min(1))
  .min(1, "Pilih minimal satu instrumen");

const phone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

const status = z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE");

const email = z.string().trim().toLowerCase().email("Email tidak valid");

/** Schema for creating a teacher — also provisions a linked GURU user account.
 * Teachers no longer carry a rate: pay is package-based, set per-enrollment
 * on `Schedule.packagePrice`/`packageSessions`. */
export const createTeacherSchema = z.object({
  name,
  email,
  instruments,
  phone,
  status,
});

/** Schema for updating a teacher — email/password are not editable here. */
export const updateTeacherSchema = z.object({
  name,
  instruments,
  phone,
  status,
});

export type CreateTeacherInput = z.input<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.input<typeof updateTeacherSchema>;
