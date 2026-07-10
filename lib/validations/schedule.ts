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
  .regex(/^\d{2}:\d{2}$/, "Jam harus berformat HH:mm");

const durationMinutes = z.coerce
  .number({ error: "Durasi wajib diisi" })
  .int("Durasi harus bilangan bulat")
  .positive("Durasi harus lebih dari 0")
  .default(60);

/** Schema for creating or updating a weekly schedule slot. */
export const scheduleSchema = z.object({
  teacherId,
  studentId,
  instrument,
  dayOfWeek,
  startTime,
  durationMinutes,
});

export const createScheduleSchema = scheduleSchema;
export const updateScheduleSchema = scheduleSchema;

export type CreateScheduleInput = z.input<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.input<typeof updateScheduleSchema>;
