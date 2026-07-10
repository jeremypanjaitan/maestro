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

const ratePerSession = z.coerce
  .number({ error: "Tarif wajib diisi" })
  .int("Tarif harus bilangan bulat")
  .positive("Tarif harus lebih dari 0");

/** Default GROUP-class rate used only to prefill the schedule form — not
 * authoritative; the actual per-enrollment rate lives on `Schedule.rate`. */
const defaultGroupRate = z.coerce
  .number()
  .int("Tarif grup harus bilangan bulat")
  .min(0, "Tarif grup tidak boleh negatif")
  .optional();

const phone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

const status = z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE");

const email = z.string().trim().toLowerCase().email("Email tidak valid");

/** Schema for creating a teacher — also provisions a linked GURU user account. */
export const createTeacherSchema = z.object({
  name,
  email,
  instruments,
  ratePerSession,
  defaultGroupRate,
  phone,
  status,
});

/** Schema for updating a teacher — email/password are not editable here. */
export const updateTeacherSchema = z.object({
  name,
  instruments,
  ratePerSession,
  defaultGroupRate,
  phone,
  status,
});

export type CreateTeacherInput = z.input<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.input<typeof updateTeacherSchema>;
