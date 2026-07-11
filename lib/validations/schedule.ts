import { z } from "zod";

/** Indonesian day-of-week labels, index 0=Minggu..6=Sabtu, matching `Schedule.dayOfWeek`. */
export const DAY_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

const teacherId = z.string().trim().min(1, "Guru wajib dipilih");

const studentId = z.string().trim().min(1, "Murid wajib dipilih");

const instrument = z.string().trim().min(1, "Instrumen wajib diisi");

const dayOfWeek = z.coerce
  .number({ error: "Hari wajib diisi" })
  .int("Hari tidak valid")
  .min(0, "Hari tidak valid")
  .max(6, "Hari tidak valid");

const startTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam harus berformat HH:mm");

const durationMinutes = z.coerce
  .number({ error: "Durasi wajib diisi" })
  .int("Durasi harus bilangan bulat")
  .positive("Durasi harus lebih dari 0")
  .default(60);

const classType = z.enum(["PRIVATE", "GROUP"], { error: "Tipe kelas wajib diisi" });

/** Total price of the package (e.g. 900000 for a 4-session package). The
 * per-session pay is derived from this and `packageSessions` via
 * `perSessionRate` — see `lib/domain/rate.ts`. */
const packagePrice = z.coerce
  .number({ error: "Harga paket wajib diisi" })
  .int("Harga paket harus bilangan bulat")
  .min(1, "Harga paket harus lebih dari 0");

/** Number of sessions included in the package (e.g. 4). */
const packageSessions = z.coerce
  .number({ error: "Jumlah sesi wajib diisi" })
  .int("Jumlah sesi harus bilangan bulat")
  .min(1, "Jumlah sesi harus lebih dari 0");

/** Schema for creating or updating a weekly schedule slot. */
export const scheduleSchema = z.object({
  teacherId,
  studentId,
  instrument,
  dayOfWeek,
  startTime,
  durationMinutes,
  classType,
  packagePrice,
  packageSessions,
});

export const createScheduleSchema = scheduleSchema;
export const updateScheduleSchema = scheduleSchema;

export type CreateScheduleInput = z.input<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.input<typeof updateScheduleSchema>;
