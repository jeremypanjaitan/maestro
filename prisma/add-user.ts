/**
 * Menambah satu user via CLI.
 *
 *   yarn add:admin <email> <password>
 *   yarn add:guru  <email> <password>
 *
 * (npm: `npm run add:admin -- <email> <password>`)
 *
 * - ADMIN: membuat user role ADMIN.
 * - GURU : membuat user role GURU + record Guru (Teacher) yang tertaut,
 *          sehingga langsung bisa dipakai (nama awal diambil dari email,
 *          bisa diedit dari UI Admin).
 *
 * Idempotent: jika email sudah ada, password & role-nya diperbarui.
 */
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  console.error("  Penggunaan:");
  console.error("    yarn add:admin <email> <password>");
  console.error("    yarn add:guru  <email> <password>\n");
  process.exit(1);
}

async function main() {
  const role = process.argv[2] as Role | undefined;
  const emailRaw = process.argv[3];
  const password = process.argv[4];

  if (role !== "ADMIN" && role !== "GURU") {
    fail(`Role tidak valid: "${role ?? ""}" (harus ADMIN atau GURU).`);
  }
  if (!emailRaw) fail("Email wajib diisi.");
  if (!password) fail("Password wajib diisi.");
  if (password.length < 6) fail("Password minimal 6 karakter.");

  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`Email tidak valid: "${emailRaw}".`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // Nama awal dari bagian lokal email (mis. "budi.santoso" -> "Budi Santoso").
  const name = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { teacher: true },
  });

  if (role === "ADMIN") {
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: "ADMIN" },
      create: { name, email, passwordHash, role: "ADMIN" },
    });
  } else {
    // GURU: user + Teacher tertaut dalam satu transaksi.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: { passwordHash, role: "GURU" },
        create: { name, email, passwordHash, role: "GURU" },
      });
      // Buat Teacher hanya bila user ini belum punya.
      const teacher = await tx.teacher.findUnique({
        where: { userId: user.id },
      });
      if (!teacher) {
        await tx.teacher.create({
          data: { name, userId: user.id, instruments: [], status: "ACTIVE" },
        });
      }
    });
  }

  const verb = existing ? "diperbarui" : "ditambahkan";
  console.log(`\n  ✓ User ${role} ${verb}`);
  console.log(`    email    : ${email}`);
  console.log(`    password : ${password}`);
  if (role === "GURU") console.log(`    + record Guru "${name}" (edit detail di UI Admin)`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
