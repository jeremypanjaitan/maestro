/**
 * Seed MINIMAL: hanya membuat 1 user admin, tanpa data lain.
 * Jalankan dengan: `npm run db:seed:admin`
 *
 * Biasanya dipakai setelah `npm run db:clear` untuk memulai dari database
 * kosong dengan satu akun admin saja. Idempotent (upsert by email).
 */
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const ADMIN_NAME = "Admin Maestro";
const ADMIN_EMAIL = "admin@maestro.test";
const ADMIN_PASSWORD = "admin123";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_NAME, passwordHash, role: "ADMIN" },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  const userCount = await prisma.user.count();

  console.log("=== Seed admin selesai ===");
  console.log(`Admin login:  email=${ADMIN_EMAIL}  password=${ADMIN_PASSWORD}`);
  console.log(`Total users di database: ${userCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
