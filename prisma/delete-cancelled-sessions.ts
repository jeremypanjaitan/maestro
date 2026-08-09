/**
 * Menghapus PERMANEN sesi berstatus CANCEL dari database.
 *
 *   npm run db:delete-cancelled            -> dry-run (hanya melaporkan)
 *   npm run db:delete-cancelled -- --apply -> benar-benar menghapus
 *
 * Keduanya memakai DATABASE_URL dari `.env`. Untuk menjalankannya terhadap
 * database lain (mis. production), taruh DATABASE_URL-nya di `.env.local`
 * lalu jalankan:
 *   npx tsx --env-file=.env.local prisma/delete-cancelled-sessions.ts
 *   npx tsx --env-file=.env.local prisma/delete-cancelled-sessions.ts --apply
 *
 * Sesi CANCEL tidak menghasilkan honor (lihat PAID_STATUSES), jadi aman
 * dibuang dari riwayat. Yang dihapus ikut sesinya: LessonReport miliknya
 * (Attachment-nya ikut ter-cascade).
 *
 * Sesi CANCEL SENGAJA DILEWATI (tidak dihapus) bila:
 *  - sudah tercakup dalam pembayaran honor (HonorPaymentItem) atau payroll
 *    (PayrollItem) — menghapusnya akan mengubah isi pembayaran yang sudah
 *    tercatat;
 *  - menjadi sesi pengganti dari sesi lain yang berstatus RESCHEDULE
 *    (rescheduledToId) — menghapusnya memutus rantai reschedule.
 * Alasan lewatnya selalu dilaporkan agar bisa ditangani manual.
 */
import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";

const APPLY = process.argv.includes("--apply");

async function main() {
  const cancelled = await prisma.session.findMany({
    where: { status: "CANCEL" },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      date: true,
      startTime: true,
      teacher: { select: { name: true } },
      student: { select: { name: true } },
      lessonReport: { select: { id: true } },
      payrollItem: { select: { id: true } },
      honorPaymentItem: { select: { id: true } },
      rescheduledFrom: { select: { id: true } },
    },
  });

  const deletable: typeof cancelled = [];
  const skipped: { row: (typeof cancelled)[number]; reason: string }[] = [];

  for (const row of cancelled) {
    const reasons: string[] = [];
    if (row.honorPaymentItem) reasons.push("sudah masuk pembayaran honor");
    if (row.payrollItem) reasons.push("sudah masuk payroll");
    if (row.rescheduledFrom) reasons.push("pengganti dari sesi RESCHEDULE");
    if (reasons.length > 0) skipped.push({ row, reason: reasons.join(", ") });
    else deletable.push(row);
  }

  const label = (r: (typeof cancelled)[number]) =>
    `${formatDbDate(r.date)} ${r.startTime}  ${r.student.name} / ${r.teacher.name}`;

  console.log(`Sesi CANCEL ditemukan : ${cancelled.length}`);
  console.log(`Akan dihapus          : ${deletable.length}`);
  console.log(`Dilewati              : ${skipped.length}`);

  if (deletable.length > 0) {
    console.log("\n--- Akan dihapus ---");
    for (const r of deletable) {
      const extra = r.lessonReport ? "  (+ lesson report)" : "";
      console.log(`  ${label(r)}${extra}`);
    }
  }

  if (skipped.length > 0) {
    console.log("\n--- Dilewati ---");
    for (const { row, reason } of skipped) {
      console.log(`  ${label(row)}  -> ${reason}`);
    }
  }

  if (!APPLY) {
    console.log(
      "\nDRY-RUN: belum ada yang dihapus. Jalankan ulang dengan `-- --apply` untuk menghapus.",
    );
    return;
  }

  if (deletable.length === 0) {
    console.log("\nTidak ada yang bisa dihapus.");
    return;
  }

  const ids = deletable.map((r) => r.id);
  const result = await prisma.$transaction(async (tx) => {
    // LessonReport tidak punya onDelete: Cascade dari Session, jadi harus
    // dihapus lebih dulu (Attachment-nya ter-cascade dari LessonReport).
    const reports = await tx.lessonReport.deleteMany({
      where: { sessionId: { in: ids } },
    });
    const sessions = await tx.session.deleteMany({ where: { id: { in: ids } } });
    return { reports: reports.count, sessions: sessions.count };
  });

  console.log(
    `\nSelesai: ${result.sessions} sesi dihapus (${result.reports} lesson report ikut terhapus).`,
  );
  console.log(`Sisa sesi CANCEL: ${await prisma.session.count({ where: { status: "CANCEL" } })}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
