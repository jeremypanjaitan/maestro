"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type StudentStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createStudentSchema,
  updateStudentSchema,
} from "@/lib/validations/student";

export type StudentActionResult = { ok: true } | { ok: false; error: string };

/** Defense-in-depth: re-checks the ADMIN role inside the action itself,
 * in addition to the `app/admin/layout.tsx` guard that renders the UI. */
async function requireAdmin(): Promise<StudentActionResult | null> {
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

/** Creates a Student. Unlike Teacher, a Student has no linked User account. */
export async function createStudent(
  input: unknown,
): Promise<StudentActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = createStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const { name, parentName, contact, instrument, level, learningTarget, status } =
    parsed.data;

  try {
    await prisma.student.create({
      data: { name, parentName, contact, instrument, level, learningTarget, status },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/students");
  return { ok: true };
}

/** Updates a student's profile fields. */
export async function updateStudent(
  id: string,
  input: unknown,
): Promise<StudentActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }
  const { name, parentName, contact, instrument, level, learningTarget, status } =
    parsed.data;

  try {
    await prisma.student.update({
      where: { id },
      data: { name, parentName, contact, instrument, level, learningTarget, status },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/students");
  return { ok: true };
}

/** Toggles a student between ACTIVE and INACTIVE. */
export async function setStudentStatus(
  id: string,
  status: StudentStatus,
): Promise<StudentActionResult> {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    await prisma.student.update({ where: { id }, data: { status } });
  } catch (error) {
    if (isNotFoundError(error)) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }
    throw error;
  }

  revalidatePath("/admin/students");
  return { ok: true };
}
