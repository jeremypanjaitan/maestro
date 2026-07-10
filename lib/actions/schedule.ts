"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasConflict, type Slot } from "@/lib/domain/conflict";
import {
  createScheduleSchema,
  updateScheduleSchema,
} from "@/lib/validations/schedule";

export type ScheduleActionResult = { ok: true } | { ok: false; error: string };

const CONFLICT_MESSAGE =
  "Jadwal bentrok dengan jadwal lain (guru atau murid sudah terpakai di slot waktu itu)";

/** Defense-in-depth: re-checks the ADMIN role inside the action itself,
 * in addition to the `app/admin/layout.tsx` guard that renders the UI. */
async function requireAdmin(): Promise<ScheduleActionResult | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Tidak diizinkan" };
  }
  return null;
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/** Checks the candidate slot against all other ACTIVE schedules on the same
 * day of week. `excludeId` lets `updateSchedule` skip the row being edited. */
async function conflictsWithActiveSchedules(
  candidate: Slot,
  dayOfWeek: number,
  excludeId?: string,
): Promise<boolean> {
  const existing = await prisma.schedule.findMany({
    where: {
      dayOfWeek,
      active: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { teacherId: true, studentId: true, startTime: true, durationMinutes: true },
  });

  return hasConflict(candidate, existing);
}

/** Creates a new weekly schedule slot, rejecting it if it conflicts with an
 * existing ACTIVE schedule on the same day (same teacher or same student with
 * overlapping time). */
export async function createSchedule(
  input: unknown,
): Promise<ScheduleActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = createScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const { teacherId, studentId, instrument, dayOfWeek, startTime, durationMinutes } =
    parsed.data;

  const candidate: Slot = { teacherId, studentId, startTime, durationMinutes };
  if (await conflictsWithActiveSchedules(candidate, dayOfWeek)) {
    return { ok: false, error: CONFLICT_MESSAGE };
  }

  try {
    await prisma.schedule.create({
      data: { teacherId, studentId, instrument, dayOfWeek, startTime, durationMinutes },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Guru atau murid tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/schedules");
  return { ok: true };
}

/** Updates a weekly schedule slot, re-running the conflict check against all
 * other ACTIVE schedules on the (possibly new) day. */
export async function updateSchedule(
  id: string,
  input: unknown,
): Promise<ScheduleActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const { teacherId, studentId, instrument, dayOfWeek, startTime, durationMinutes } =
    parsed.data;

  const candidate: Slot = { teacherId, studentId, startTime, durationMinutes };
  if (await conflictsWithActiveSchedules(candidate, dayOfWeek, id)) {
    return { ok: false, error: CONFLICT_MESSAGE };
  }

  try {
    await prisma.schedule.update({
      where: { id },
      data: { teacherId, studentId, instrument, dayOfWeek, startTime, durationMinutes },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Jadwal tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/schedules");
  return { ok: true };
}

/** Flips a schedule's `active` flag. Deactivated schedules are excluded from
 * conflict checks and no longer generate new sessions. Reactivating
 * (false -> true) re-runs the conflict check, since another schedule may
 * have been created for the same teacher/student/slot while this one was
 * inactive. Deactivating (true -> false) never conflicts. */
export async function toggleSchedule(id: string): Promise<ScheduleActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  let schedule;
  try {
    schedule = await prisma.schedule.findUniqueOrThrow({ where: { id } });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Jadwal tidak ditemukan" };
    }
    throw error;
  }

  const reactivating = !schedule.active;
  if (reactivating) {
    const candidate: Slot = {
      teacherId: schedule.teacherId,
      studentId: schedule.studentId,
      startTime: schedule.startTime,
      durationMinutes: schedule.durationMinutes,
    };
    if (await conflictsWithActiveSchedules(candidate, schedule.dayOfWeek, id)) {
      return { ok: false, error: CONFLICT_MESSAGE };
    }
  }

  try {
    await prisma.schedule.update({
      where: { id },
      data: { active: reactivating },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Jadwal tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/schedules");
  return { ok: true };
}
