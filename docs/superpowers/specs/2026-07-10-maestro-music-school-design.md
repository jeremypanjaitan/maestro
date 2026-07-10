# Maestro — Music School Management System — Design Spec

**Date:** 2026-07-10
**Status:** Approved for implementation planning

## 1. Overview

Sistem manajemen sekolah musik untuk mengelola murid, guru, jadwal, absensi,
lesson report, dokumentasi kelas, dan payroll guru. Dua peran: **Admin** dan
**Guru**.

## 2. Stack & Keputusan Teknis

| Area        | Pilihan |
|-------------|---------|
| Framework   | Next.js 15 (App Router, TypeScript, Server Actions) |
| UI          | shadcn/ui + Tailwind CSS |
| Database    | PostgreSQL @ localhost:5432, db `maestro`, user/pass `postgres`/`postgres` |
| ORM         | Prisma (schema deklaratif, migrate, seed) |
| Auth        | Auth.js (NextAuth) Credentials provider — email + password, session cookie JWT, role-based |
| Password    | bcrypt hash |
| Export      | PDF (`@react-pdf/renderer`) + Excel (`exceljs`) |
| Media       | Foto/video/audio disimpan di DB sebagai base64 (kolom TEXT) |

## 3. Peran & Hak Akses

### Admin
- CRUD guru, CRUD murid
- Kelola jadwal (template mingguan + generate sesi)
- Kelola tarif guru
- Kelola/override absensi
- Payroll: generate, ubah status (Draft/Approved/Paid), export PDF/Excel
- Lihat semua laporan
- Dashboard admin

### Guru
- Lihat jadwal & kalender (miliknya)
- Input absensi (sesi miliknya)
- Isi lesson report + upload foto/video/audio
- Lihat riwayat mengajar
- Lihat payroll (miliknya)
- Dashboard guru

Route diproteksi middleware berdasarkan role. Guru hanya melihat data miliknya.

## 4. Data Model (Prisma)

```
User          id, name, email (unique), passwordHash, role (ADMIN|GURU),
              teacherId? (relasi ke Teacher bila role GURU), createdAt

Teacher       id, name, instruments (string[] / relasi Instrument), ratePerSession (Int),
              phone, status (ACTIVE|INACTIVE), userId?, createdAt

Student       id, name, parentName, contact, instrument, level,
              learningTarget, status (ACTIVE|INACTIVE), createdAt

Schedule      id, teacherId, studentId, instrument, dayOfWeek (0-6),
              startTime (HH:mm), durationMinutes, active (bool), createdAt
              -- template jadwal mingguan berulang

Session       id, scheduleId? (nullable bila ad-hoc/reschedule), teacherId,
              studentId, date (Date), startTime (HH:mm), durationMinutes,
              status (HADIR|MURID_TIDAK_HADIR|GURU_TIDAK_HADIR|RESCHEDULE|CANCEL),
              rescheduledToId? (link ke sesi pengganti), createdAt

LessonReport  id, sessionId (unique), material, target, result, homework,
              grade, notes, createdAt, updatedAt

Attachment    id, lessonReportId, type (PHOTO|VIDEO|AUDIO), filename,
              mimeType, dataBase64 (TEXT), createdAt

Payroll       id, teacherId, periodMonth (1-12), periodYear,
              status (DRAFT|APPROVED|PAID), total (Int), generatedAt, updatedAt
              -- unique (teacherId, periodMonth, periodYear)

PayrollItem   id, payrollId, sessionId, rate (Int)
              -- satu baris per sesi HADIR yang masuk periode
```

Enum: `Role`, `TeacherStatus`, `StudentStatus`, `SessionStatus`, `AttachmentType`,
`PayrollStatus`.

## 5. Logika Bisnis

### Jadwal
- `Schedule` = template mingguan berulang (guru + murid + hari + jam).
- Admin menekan "Generate Sesi" untuk rentang tanggal (mis. satu bulan). Sistem
  membuat `Session` untuk setiap tanggal yang cocok dengan `dayOfWeek` dari
  schedule aktif. Idempotent: tidak menduplikasi sesi yang sudah ada pada
  (scheduleId, date).
- **Validasi bentrok:** guru maupun murid tidak boleh memiliki dua sesi yang
  tumpang tindih waktunya pada tanggal yang sama (juga divalidasi saat membuat
  schedule dan sesi ad-hoc/reschedule).

### Absensi
- Guru (atau admin) menetapkan `status` tiap `Session`.
- **Reschedule:** sesi lama diberi status `RESCHEDULE`, dibuat `Session` baru
  dengan tanggal/jam baru (status default terjadwal), `rescheduledToId` menautkan
  keduanya. Sesi `RESCHEDULE` tidak dibayar; sesi pengganti dibayar bila jadi
  `HADIR`.
- **Cancel:** status `CANCEL`, tidak dibayar.

### Lesson Report
- Satu `LessonReport` per `Session`. Berisi materi, target, hasil, homework,
  penilaian (grade), catatan, dan lampiran (foto wajib-opsional, video/audio
  opsional) sebagai base64.

### Riwayat Perkembangan Murid
- Timeline gabungan `Session` + `LessonReport` per murid, diurutkan tanggal:
  materi, nilai, catatan, dan dokumentasi.

### Payroll
- Generate per (guru, bulan, tahun): kumpulkan `Session` berstatus **HADIR** milik
  guru dalam periode → buat `PayrollItem` (rate = `ratePerSession` guru saat
  generate) → `total` = jumlah item × rate.
- Status alur: `DRAFT` → `APPROVED` → `PAID` (admin).
- Export PDF & Excel berisi rincian per sesi.

### Dashboard
- **Admin:** total murid aktif, total guru aktif, jadwal/sesi hari ini, ringkasan
  payroll periode berjalan.
- **Guru:** jadwal/sesi hari ini, estimasi honor bulan berjalan (sesi HADIR ×
  tarif), ringkasan progress murid yang diajar.

### Laporan
- Rekap absensi (per periode, filter guru/murid/status).
- Rekap jam mengajar (jumlah sesi/durasi per guru).
- Rekap perkembangan murid (timeline + nilai).
- Rekap payroll (per periode).
- Semua rekap dapat di-export PDF/Excel bila relevan.

## 6. Struktur Kode

```
app/
  (auth)/login/page.tsx
  (admin)/dashboard, teachers, students, schedules, sessions,
          payroll, reports, rates/...
  (guru)/dashboard, schedule, sessions, reports, payroll/...
  api/           # route handlers bila perlu (utamakan Server Actions)
components/
  ui/            # shadcn
  ...            # komponen fitur (tables, forms, calendar, timeline)
lib/
  prisma.ts      # Prisma client singleton
  auth.ts        # konfigurasi Auth.js
  actions/       # Server Actions per domain
  export/        # pdf.ts, excel.ts
  validations/   # zod schemas
  utils.ts
prisma/
  schema.prisma
  seed.ts
middleware.ts    # proteksi route + role
```

## 7. Seed Data

Admin default, 2–3 guru (dengan user login), beberapa murid, schedule mingguan,
sesi ter-generate satu periode, beberapa lesson report + lampiran contoh, dan
satu payroll draft — agar aplikasi langsung bisa dicoba end-to-end.

Kredensial admin default akan dicetak/dicantumkan setelah seed.

## 8. Verifikasi

Verifikasi manual alur utama setelah implementasi:
login → CRUD guru/murid → buat schedule → generate sesi → input absensi →
isi lesson report + upload → lihat timeline murid → generate & approve payroll →
export PDF/Excel → cek dashboard admin & guru.

## 9. Out of Scope (Roadmap — bagian 10 requirements)

Pembayaran murid, paket les, portal orang tua, galeri dokumentasi publik,
notifikasi, analitik lanjutan. Tidak dibuat pada iterasi ini.
