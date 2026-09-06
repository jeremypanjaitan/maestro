# CLAUDE.md — maestro

## Database staging (STG)

STG memakai Neon Postgres. **Kredensialnya ada di `.env.local`** (gitignored
lewat pola `.env*.local`) — jangan pernah menaruh connection string atau
password di file ini, di `.env.example`, atau di file lain yang di-commit.

Kalau `.env.local` belum ada, buat dengan isi `DATABASE_URL=<STG url>`.

Menjalankan script prisma terhadap STG:

```bash
npx tsx --env-file=.env.local prisma/<script>.ts
```

**Pakai host UNPOOLED (`ep-...` tanpa `-pooler`) untuk script tsx/Prisma.**
URL pooler Neon membawa `channel_binding=require`, yang ditolak Prisma engine
dengan pesan menyesatkan `Can't reach database server` walaupun TCP-nya
tersambung. Host unpooled dengan `?sslmode=require` bekerja normal.

## Aturan domain

- **Honor hanya untuk sesi yang benar-benar terjadi.** `NON_HONOR_STATUSES`
  di `lib/domain/constants.ts` (`CANCEL`, `RESCHEDULE`) adalah sumber tunggal:
  status tersebut tidak muncul di tabel Status Sesi, tidak bisa dipilih di
  dialog pembayaran, dan ditolak server action `createHonorPayment`. Sesi
  RESCHEDULE dibayar lewat sesi penggantinya, bukan lewat dirinya sendiri.
- `PAID_STATUSES` (`HADIR`) dipakai terpisah oleh perhitungan payroll di
  `lib/domain/payroll.ts`.

## Script audit

- `npm run db:check-non-honor` — read-only, melaporkan pembayaran honor lama
  yang terlanjur mencakup sesi CANCEL/RESCHEDULE.
- `npm run db:delete-cancelled` — dry-run; `-- --apply` untuk benar-benar
  menghapus sesi CANCEL.
