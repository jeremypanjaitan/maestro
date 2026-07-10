/**
 * Mengosongkan SELURUH data di database (semua tabel), tanpa menghapus skema.
 * Jalankan dengan: `npm run db:clear`
 *
 * Urutan delete mengikuti dependency foreign-key (child dulu, baru parent)
 * agar tidak melanggar constraint. Setelah ini, jalankan `npm run db:seed`
 * bila ingin mengisi ulang data contoh.
 */
import { prisma } from "@/lib/prisma";

async function main() {
  // FK-safe order: child -> parent
  await prisma.payrollItem.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.lessonReport.deleteMany();
  await prisma.session.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  console.log("=== Semua data dikosongkan ===");
  const counts = {
    users: await prisma.user.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    schedules: await prisma.schedule.count(),
    sessions: await prisma.session.count(),
    lessonReports: await prisma.lessonReport.count(),
    attachments: await prisma.attachment.count(),
    payrolls: await prisma.payroll.count(),
    payrollItems: await prisma.payrollItem.count(),
  };
  console.table(counts);
  console.log("Jalankan `npm run db:seed` untuk mengisi ulang data contoh.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
