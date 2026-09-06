/**
 * AUDIT (read-only): mencari pembayaran honor lama yang terlanjur mencakup
 * sesi berstatus non-honor (CANCEL / RESCHEDULE).
 *
 * Sejak sesi RESCHEDULE dikeluarkan dari alur honor (lihat NON_HONOR_STATUSES
 * di `lib/domain/constants.ts`), sesi seperti itu tidak lagi bisa dipilih
 * untuk pembayaran baru. Tapi pembayaran yang SUDAH tercatat sebelumnya tidak
 * ikut berubah — script ini melaporkannya supaya bisa ditinjau manual.
 *
 * Script ini TIDAK mengubah apa pun.
 *
 *   npx tsx prisma/check-non-honor-payments.ts                      -> pakai .env
 *   npx tsx --env-file=.env.local prisma/check-non-honor-payments.ts -> DB lain (mis. staging)
 */
import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { NON_HONOR_STATUSES, SESSION_STATUS_LABELS } from "@/lib/domain/constants";

async function main() {
  const byStatus = await prisma.session.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  console.log("Sesi per status:");
  for (const row of [...byStatus].sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${SESSION_STATUS_LABELS[row.status].padEnd(20)} ${row._count._all}`);
  }

  const affected = await prisma.honorPaymentItem.findMany({
    where: { session: { status: { in: NON_HONOR_STATUSES } } },
    select: {
      rateSnapshot: true,
      honorPayment: {
        select: {
          id: true,
          paidAt: true,
          amount: true,
          teacher: { select: { name: true } },
        },
      },
      session: {
        select: {
          date: true,
          startTime: true,
          status: true,
          student: { select: { name: true } },
        },
      },
    },
  });

  console.log(
    `\nItem pembayaran honor yang mencakup sesi ${NON_HONOR_STATUSES.join("/")}: ${affected.length}`,
  );

  if (affected.length === 0) {
    console.log("Tidak ada data lama yang perlu ditinjau.");
    return;
  }

  const sorted = [...affected].sort(
    (a, b) => a.session.date.getTime() - b.session.date.getTime(),
  );
  for (const item of sorted) {
    const s = item.session;
    const p = item.honorPayment;
    console.log(
      `  ${formatDbDate(s.date)} ${s.startTime}  ${s.student.name} / ${p.teacher.name}` +
        `  [${SESSION_STATUS_LABELS[s.status]}]` +
        `  rate ${item.rateSnapshot}` +
        `  -> pembayaran ${p.id} (${formatDbDate(p.paidAt)}, total ${p.amount})`,
    );
  }

  const payments = new Set(sorted.map((i) => i.honorPayment.id));
  console.log(
    `\nTersebar di ${payments.size} pembayaran. Tinjau manual — script ini tidak mengubah apa pun.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
