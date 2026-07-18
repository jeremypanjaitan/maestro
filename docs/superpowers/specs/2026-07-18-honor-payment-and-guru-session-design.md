# Pembayaran Honor + Guru Buat Sesi — Design

Date: 2026-07-18

Dua fitur terpisah yang dikerjakan bersamaan.

## Fitur A — Pembayaran Honor Guru

Admin membayar honor guru dengan memilih sesi mana yang dibayar, menetapkan
nominal total, dan mengunggah bukti transfer. Guru dapat melihat (read-only)
honornya. Menu "Payroll" lama (yang disembunyikan) di-repurpose menjadi menu
"Pembayaran Honor". Kode payroll lama dibiarkan utuh.

### Keputusan
- Pengelompokan **fleksibel**: satu pembayaran boleh mencakup beberapa sesi
  lintas tanggal/murid (milik satu guru), dengan satu bukti.
- Nominal **input manual total** (bukan dijumlah otomatis dari rate). Rate sesi
  ditampilkan sebagai acuan & disimpan sebagai `rateSnapshot`.
- **Satu langkah**: buat pembayaran = langsung LUNAS. Bukti **wajib** ada saat
  pembuatan (minimal 1 file).
- **Semua sesi** boleh dibayar apa pun statusnya (admin yang menentukan).
- Satu sesi hanya boleh masuk **satu** pembayaran (unique di DB).
- Guru: read-only (lihat status sesi sudah/belum dibayar + lihat bukti).

### Data model (Prisma) — via `prisma db push`
- `HonorPayment` { id, teacherId, amount:Int, paidAt:Date, note?, items[], proofs[], createdAt }
- `HonorPaymentItem` { id, honorPaymentId (cascade), sessionId @unique, rateSnapshot:Int }
- `HonorPaymentProof` { id, honorPaymentId (cascade), filename, mimeType, dataBase64 @db.Text, createdAt }
- `Session.honorPaymentItem HonorPaymentItem?`, `Teacher.honorPayments HonorPayment[]`
- Status "sudah dibayar" per sesi = sesi punya `honorPaymentItem`.

### Bukti
- Terima gambar (bukan SVG) + PDF. Base64 murni + mimeType (pola `Attachment`).
- Validasi ulang di server (tipe + ukuran). Cap ~5MB per file.

### Server actions — `lib/actions/honor.ts`
- `createHonorPayment({ teacherId, sessionIds[], amount, paidAtISO, note?, proofs[] })`
  - requireAdmin; validasi teacher, amount>0, ≥1 sesi valid & milik guru & belum
    diklaim, ≥1 bukti valid; transaksi buat payment+items(rateSnapshot)+proofs.
- `deleteHonorPayment(id)` — requireAdmin; cascade hapus (sesi balik belum dibayar).

### Queries — `lib/queries/honor.ts`
- `getAdminHonorData(teacherId?)` — daftar guru, status sesi (paid/unpaid) per guru terpilih, riwayat pembayaran.
- `getHonorPayment(id)` — detail + items + proofs (admin).
- `getGuruHonorData()` — read-only untuk guru login.

### UI
- Menu admin & guru: "Pembayaran Honor" (ganti label payroll lama).
- `/admin/honor` — pilih guru → tabel status sesi + tabel riwayat + tombol "Buat Pembayaran" (dialog pilih sesi + nominal + tanggal + upload bukti).
- `/admin/honor/[id]` — detail pembayaran + galeri bukti + hapus.
- `/guru/honor` — read-only: status sesi & bukti.

## Fitur B — Guru Buat Sesi

Guru dapat membuat sesi one-off untuk **muridnya sendiri**, langsung aktif.

### Keputusan
- Murid yang bisa dipilih: hanya murid yang punya jadwal/sesi dengan guru itu.
- Langsung `SCHEDULED` (tanpa approval).
- Tanpa input harga: `packagePrice=0, packageSessions=1, rate=0` (admin atur saat bayar honor).
- `teacherId` dikunci ke guru yang login (dari `auth()`), tidak dari client.

### Server action — `lib/actions/session.ts`
- `createGuruSession({ studentId, dateISO, startTime, durationMinutes, classType })`
  - requireGuru; teacherId dari auth; verifikasi student milik guru (punya schedule/session);
    conflict check (reuse `hasConflict`); buat sesi SCHEDULED, rate 0.

### Query
- `getStudentsForTeacher(teacherId)` — murid yang punya schedule/session dgn guru.

### UI
- `components/guru-add-session-dialog.tsx` — dialog (murid dropdown terbatas, tanggal/jam/durasi/tipe).
- Tombol "Tambah Sesi" di `/guru/sessions`.
