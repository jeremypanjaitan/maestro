"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma, type TeacherStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTeacherSchema,
  updateTeacherSchema,
} from "@/lib/validations/teacher";

/** Default password assigned to a newly-created GURU account. */
const DEFAULT_GURU_PASSWORD = "guru123";

export type TeacherActionResult = { ok: true } | { ok: false; error: string };

/** Defense-in-depth: re-checks the ADMIN role inside the action itself,
 * in addition to the `app/admin/layout.tsx` guard that renders the UI. */
async function requireAdmin(): Promise<TeacherActionResult | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Tidak diizinkan" };
  }
  return null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/** Creates a Teacher plus a linked User (role GURU, default password) in one transaction. */
export async function createTeacher(
  input: unknown,
): Promise<TeacherActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = createTeacherSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const { name, email, instruments, ratePerSession, defaultGroupRate, phone, status } =
    parsed.data;

  try {
    const passwordHash = await bcrypt.hash(DEFAULT_GURU_PASSWORD, 10);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: "GURU" },
      });
      await tx.teacher.create({
        data: {
          name,
          instruments,
          ratePerSession,
          defaultGroupRate,
          phone,
          status,
          userId: user.id,
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "Email sudah digunakan" };
    }
    throw error;
  }

  revalidatePath("/admin/teachers");
  return { ok: true };
}

/** Updates a teacher's profile fields and keeps the linked User's name in sync. */
export async function updateTeacher(
  id: string,
  input: unknown,
): Promise<TeacherActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = updateTeacherSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const { name, instruments, ratePerSession, defaultGroupRate, phone, status } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.update({
        where: { id },
        data: { name, instruments, ratePerSession, defaultGroupRate, phone, status },
      });
      if (teacher.userId) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: { name },
        });
      }
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Guru tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/teachers");
  return { ok: true };
}

/** Toggles a teacher between ACTIVE and INACTIVE. */
export async function setTeacherStatus(
  id: string,
  status: TeacherStatus,
): Promise<TeacherActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    await prisma.teacher.update({ where: { id }, data: { status } });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Guru tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/teachers");
  return { ok: true };
}
