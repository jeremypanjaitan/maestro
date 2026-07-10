# Maestro Music School Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web manajemen sekolah musik (Admin + Guru) untuk mengelola guru, murid, jadwal, absensi, lesson report, riwayat murid, dan payroll.

**Architecture:** Next.js 15 App Router monolith. Server Actions untuk mutasi, Server Components untuk read. Prisma → PostgreSQL. Auth.js Credentials + middleware role-based. Business logic murni (payroll, generate sesi, validasi bentrok) diisolasi di `lib/domain/` dan di-TDD dengan Vitest. Media disimpan base64 di DB.

**Tech Stack:** Next.js 15, TypeScript, shadcn/ui, Tailwind, Prisma, PostgreSQL, Auth.js (NextAuth v5), bcryptjs, zod, exceljs, @react-pdf/renderer, Vitest.

## Global Constraints

- Database: PostgreSQL @ `localhost:5432`, db `maestro`, user `postgres`, pass `postgres`. `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maestro?schema=public"`
- Roles: `ADMIN`, `GURU`. Guru hanya mengakses data miliknya sendiri.
- Session statuses: `HADIR | MURID_TIDAK_HADIR | GURU_TIDAK_HADIR | RESCHEDULE | CANCEL`.
- Payroll: hanya sesi `HADIR` dibayar; rate = `ratePerSession` guru saat generate.
- Media (foto/video/audio) disimpan sebagai base64 di kolom TEXT.
- Semua uang dalam Integer (Rupiah, tanpa desimal).
- Setiap task diakhiri commit. TDD untuk `lib/domain/*`.

---

## Phase 0 — Scaffolding & Fondasi

### Task 1: Inisialisasi proyek Next.js + Tailwind + shadcn

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components.json`, `.env`, `.env.example`

**Steps:**
- [ ] **Step 1:** Scaffold app:
  ```bash
  npx create-next-app@latest . --ts --tailwind --app --src-dir=false --eslint --import-alias "@/*" --no-turbopack --use-npm --yes
  ```
- [ ] **Step 2:** Inisialisasi shadcn:
  ```bash
  npx shadcn@latest init -d
  ```
- [ ] **Step 3:** Tambahkan komponen shadcn yang dipakai lintas fitur:
  ```bash
  npx shadcn@latest add button input label card table dialog dropdown-menu select textarea badge sonner tabs form calendar popover avatar separator sheet skeleton alert-dialog
  ```
- [ ] **Step 4:** Buat `.env` dan `.env.example` berisi:
  ```
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maestro?schema=public"
  AUTH_SECRET="dev-secret-change-me"
  AUTH_TRUST_HOST=true
  ```
- [ ] **Step 5:** Jalankan `npm run build` untuk memastikan scaffold sehat. Expected: build sukses.
- [ ] **Step 6:** Commit `chore: scaffold next.js app with tailwind and shadcn`.

### Task 2: Setup Prisma + skema database + Vitest

**Files:**
- Create: `prisma/schema.prisma`, `lib/prisma.ts`, `vitest.config.ts`
- Modify: `package.json` (scripts)

**Interfaces produced:**
- `prisma` client singleton di `@/lib/prisma` (`export const prisma`).
- Semua model & enum sesuai spec bagian 4.

**Steps:**
- [ ] **Step 1:** Install deps:
  ```bash
  npm i prisma @prisma/client bcryptjs zod && npm i -D vitest @types/bcryptjs tsx
  ```
- [ ] **Step 2:** Tulis `prisma/schema.prisma` lengkap:
  ```prisma
  generator client { provider = "prisma-client-js" }
  datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

  enum Role { ADMIN GURU }
  enum TeacherStatus { ACTIVE INACTIVE }
  enum StudentStatus { ACTIVE INACTIVE }
  enum SessionStatus { SCHEDULED HADIR MURID_TIDAK_HADIR GURU_TIDAK_HADIR RESCHEDULE CANCEL }
  enum AttachmentType { PHOTO VIDEO AUDIO }
  enum PayrollStatus { DRAFT APPROVED PAID }

  model User {
    id           String  @id @default(cuid())
    name         String
    email        String  @unique
    passwordHash String
    role         Role
    teacher      Teacher?
    createdAt    DateTime @default(now())
  }

  model Teacher {
    id             String @id @default(cuid())
    name           String
    instruments    String[]
    ratePerSession Int
    phone          String?
    status         TeacherStatus @default(ACTIVE)
    user           User?   @relation(fields: [userId], references: [id])
    userId         String? @unique
    schedules      Schedule[]
    sessions       Session[]
    payrolls       Payroll[]
    createdAt      DateTime @default(now())
  }

  model Student {
    id             String @id @default(cuid())
    name           String
    parentName     String?
    contact        String?
    instrument     String
    level          String?
    learningTarget String?
    status         StudentStatus @default(ACTIVE)
    schedules      Schedule[]
    sessions       Session[]
    createdAt      DateTime @default(now())
  }

  model Schedule {
    id              String @id @default(cuid())
    teacher         Teacher @relation(fields: [teacherId], references: [id])
    teacherId       String
    student         Student @relation(fields: [studentId], references: [id])
    studentId       String
    instrument      String
    dayOfWeek       Int      // 0=Minggu..6=Sabtu
    startTime       String   // "HH:mm"
    durationMinutes Int      @default(60)
    active          Boolean  @default(true)
    sessions        Session[]
    createdAt       DateTime @default(now())
  }

  model Session {
    id              String @id @default(cuid())
    schedule        Schedule? @relation(fields: [scheduleId], references: [id])
    scheduleId      String?
    teacher         Teacher @relation(fields: [teacherId], references: [id])
    teacherId       String
    student         Student @relation(fields: [studentId], references: [id])
    studentId       String
    date            DateTime @db.Date
    startTime       String
    durationMinutes Int      @default(60)
    status          SessionStatus @default(SCHEDULED)
    rescheduledTo   Session?  @relation("Reschedule", fields: [rescheduledToId], references: [id])
    rescheduledToId String?   @unique
    rescheduledFrom Session?  @relation("Reschedule")
    lessonReport    LessonReport?
    payrollItem     PayrollItem?
    createdAt       DateTime @default(now())
    @@index([teacherId, date])
    @@index([studentId, date])
  }

  model LessonReport {
    id          String @id @default(cuid())
    session     Session @relation(fields: [sessionId], references: [id])
    sessionId   String  @unique
    material    String?
    target      String?
    result      String?
    homework    String?
    grade       String?
    notes       String?
    attachments Attachment[]
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }

  model Attachment {
    id             String @id @default(cuid())
    lessonReport   LessonReport @relation(fields: [lessonReportId], references: [id], onDelete: Cascade)
    lessonReportId String
    type           AttachmentType
    filename       String
    mimeType       String
    dataBase64     String @db.Text
    createdAt      DateTime @default(now())
  }

  model Payroll {
    id          String @id @default(cuid())
    teacher     Teacher @relation(fields: [teacherId], references: [id])
    teacherId   String
    periodMonth Int
    periodYear  Int
    status      PayrollStatus @default(DRAFT)
    total       Int      @default(0)
    items       PayrollItem[]
    generatedAt DateTime @default(now())
    updatedAt   DateTime @updatedAt
    @@unique([teacherId, periodMonth, periodYear])
  }

  model PayrollItem {
    id        String @id @default(cuid())
    payroll   Payroll @relation(fields: [payrollId], references: [id], onDelete: Cascade)
    payrollId String
    session   Session @relation(fields: [sessionId], references: [id])
    sessionId String  @unique
    rate      Int
  }
  ```
  Catatan: `SessionStatus` menambahkan `SCHEDULED` sebagai status awal sesi ter-generate (belum diabsen). Status absensi dari spec tetap ada.
- [ ] **Step 3:** Buat `lib/prisma.ts` (singleton pola Next.js dev-safe).
- [ ] **Step 4:** Tambah scripts di `package.json`: `"db:push": "prisma db push"`, `"db:seed": "tsx prisma/seed.ts"`, `"test": "vitest run"`, `"prisma": { "seed": "tsx prisma/seed.ts" }`.
- [ ] **Step 5:** Buat `vitest.config.ts` (environment node, alias `@`).
- [ ] **Step 6:** Jalankan `npx prisma generate` lalu `npm run db:push`. Expected: skema ter-push ke db `maestro` tanpa error.
- [ ] **Step 7:** Commit `feat: add prisma schema and db client`.

---

## Phase 1 — Domain Logic (TDD)

### Task 3: Util waktu & konstanta status

**Files:**
- Create: `lib/domain/constants.ts`, `lib/domain/time.ts`, `lib/domain/time.test.ts`

**Interfaces produced:**
- `SESSION_STATUS_LABELS: Record<SessionStatus,string>`, `PAID_STATUSES: SessionStatus[]` (`['HADIR']`).
- `toMinutes(hhmm: string): number`
- `rangesOverlap(startA: string, durA: number, startB: string, durB: number): boolean`

**Steps:**
- [ ] **Step 1:** Tulis test `lib/domain/time.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest'
  import { toMinutes, rangesOverlap } from './time'
  describe('toMinutes', () => {
    it('parses HH:mm', () => { expect(toMinutes('09:30')).toBe(570) })
  })
  describe('rangesOverlap', () => {
    it('detects overlap', () => { expect(rangesOverlap('09:00',60,'09:30',60)).toBe(true) })
    it('adjacent not overlap', () => { expect(rangesOverlap('09:00',60,'10:00',60)).toBe(false) })
    it('disjoint', () => { expect(rangesOverlap('09:00',60,'11:00',30)).toBe(false) })
  })
  ```
- [ ] **Step 2:** Run `npm test` → FAIL (module not found).
- [ ] **Step 3:** Implement `lib/domain/time.ts` dan `lib/domain/constants.ts`.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: add time and status domain utils (TDD)`.

### Task 4: Generate sesi dari schedule (pure function)

**Files:**
- Create: `lib/domain/generateSessions.ts`, `lib/domain/generateSessions.test.ts`

**Interfaces produced:**
- ```ts
  type ScheduleInput = { id: string; teacherId: string; studentId: string; instrument: string; dayOfWeek: number; startTime: string; durationMinutes: number }
  type PlannedSession = { scheduleId: string; teacherId: string; studentId: string; date: string; startTime: string; durationMinutes: number }
  function planSessions(schedules: ScheduleInput[], from: Date, to: Date, existingKeys: Set<string>): PlannedSession[]
  ```
  `existingKeys` berisi kunci `"${scheduleId}|${YYYY-MM-DD}"` yang sudah ada → di-skip (idempotent). Menghasilkan satu sesi per tanggal dalam [from,to] yang `getDay()===dayOfWeek`.

**Steps:**
- [ ] **Step 1:** Tulis test: rentang 2 minggu, satu schedule Senin → hasil 2 sesi tanggal Senin; dengan `existingKeys` berisi satu tanggal → 1 sesi.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `planSessions`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add session generation logic (TDD)`.

### Task 5: Deteksi bentrok jadwal (pure function)

**Files:**
- Create: `lib/domain/conflict.ts`, `lib/domain/conflict.test.ts`

**Interfaces produced:**
- ```ts
  type Slot = { teacherId: string; studentId: string; startTime: string; durationMinutes: number }
  // cek apakah `candidate` bentrok dengan salah satu `existing` (guru sama ATAU murid sama, pada waktu overlap)
  function hasConflict(candidate: Slot, existing: Slot[]): boolean
  ```

**Steps:**
- [ ] **Step 1:** Tulis test: bentrok karena guru sama overlap; bentrok karena murid sama overlap; tidak bentrok jika beda guru & murid; tidak bentrok jika waktu tidak overlap.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `hasConflict`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add schedule conflict detection (TDD)`.

### Task 6: Kalkulasi payroll (pure function)

**Files:**
- Create: `lib/domain/payroll.ts`, `lib/domain/payroll.test.ts`

**Interfaces produced:**
- ```ts
  type PayrollSessionInput = { sessionId: string; status: string; date: Date }
  type PayrollComputation = { items: { sessionId: string; rate: number }[]; total: number }
  function computePayroll(sessions: PayrollSessionInput[], ratePerSession: number): PayrollComputation
  ```
  Hanya `status === 'HADIR'` yang menghasilkan item. `total = items.length * ratePerSession`.

**Steps:**
- [ ] **Step 1:** Tulis test: campuran status → hanya HADIR dihitung; rate benar; total benar; array kosong → total 0.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `computePayroll`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add payroll computation (TDD)`.

---

## Phase 2 — Auth & Layout

### Task 7: Auth.js Credentials + middleware role

**Files:**
- Create: `lib/auth.ts`, `auth.config.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`, `types/next-auth.d.ts`
- Modify: `.env`

**Interfaces produced:**
- `auth()`, `signIn`, `signOut`, `handlers` dari `@/lib/auth`.
- Session `user` memuat `id`, `role`, `teacherId?`.

**Steps:**
- [ ] **Step 1:** Install `npm i next-auth@beta`.
- [ ] **Step 2:** Buat `auth.config.ts` (authorized callback: redirect belum-login ke `/login`; batasi `/admin/*` untuk ADMIN, `/guru/*` untuk GURU).
- [ ] **Step 3:** Buat `lib/auth.ts` dengan Credentials provider: cari `User` by email, verifikasi bcrypt, kembalikan `{id,name,email,role,teacherId}`. JWT + session callback menambahkan `role` & `teacherId`.
- [ ] **Step 4:** Buat `types/next-auth.d.ts` augmentasi tipe session/JWT.
- [ ] **Step 5:** Buat route handler & `middleware.ts` (matcher `/admin/:path*`, `/guru/:path*`).
- [ ] **Step 6:** Verifikasi `npm run build` sukses. (Test login dilakukan di Task 9 setelah seed.)
- [ ] **Step 7:** Commit `feat: add credentials auth and role middleware`.

### Task 8: Halaman login + logout

**Files:**
- Create: `app/(auth)/login/page.tsx`, `lib/actions/auth.ts`, `components/logout-button.tsx`

**Interfaces consumed:** `signIn`, `signOut` dari `@/lib/auth`.

**Steps:**
- [ ] **Step 1:** Buat form login (shadcn `form`/`input`/`button`) → Server Action `authenticate` memanggil `signIn('credentials', ...)`, tampilkan error via `sonner`.
- [ ] **Step 2:** Redirect setelah login sesuai role (ADMIN→`/admin/dashboard`, GURU→`/guru/dashboard`).
- [ ] **Step 3:** Buat `LogoutButton`.
- [ ] **Step 4:** `npm run build` sukses.
- [ ] **Step 5:** Commit `feat: add login page and logout`.

### Task 9: Seed data + verifikasi login end-to-end

**Files:**
- Create: `prisma/seed.ts`

**Steps:**
- [ ] **Step 1:** Tulis `prisma/seed.ts`: 1 admin (`admin@maestro.test` / `admin123`), 3 guru (+user login `guru123`), 8 murid, schedule mingguan untuk tiap guru, generate sesi bulan berjalan via `planSessions`, set sebagian sesi `HADIR` + lesson report (+1 attachment base64 kecil), 1 payroll DRAFT. Gunakan bcrypt hash. Idempotent (`upsert` by email).
- [ ] **Step 2:** Run `npm run db:seed`. Expected: sukses, cetak kredensial admin.
- [ ] **Step 3:** `npm run dev`, buka `/login`, login admin → sampai `/admin/dashboard` (placeholder ok); login guru → `/guru/dashboard`. Verifikasi middleware memblokir cross-role.
- [ ] **Step 4:** Commit `feat: add seed data`.

### Task 10: Shell layout Admin & Guru (sidebar/nav)

**Files:**
- Create: `app/(admin)/layout.tsx`, `app/(guru)/layout.tsx`, `components/app-sidebar.tsx`, `components/nav-user.tsx`, `lib/nav.ts`, `app/(admin)/dashboard/page.tsx` (placeholder), `app/(guru)/dashboard/page.tsx` (placeholder)

**Interfaces consumed:** `auth()` untuk guard + nama/role user.

**Steps:**
- [ ] **Step 1:** Definisikan menu di `lib/nav.ts` per role.
- [ ] **Step 2:** Buat sidebar responsif (shadcn `sheet` untuk mobile) + header dengan nama user & LogoutButton.
- [ ] **Step 3:** Layout memanggil `auth()`; redirect `/login` bila null.
- [ ] **Step 4:** `npm run dev` — cek navigasi kedua role.
- [ ] **Step 5:** Commit `feat: add admin and guru app shells`.

---

## Phase 3 — Master Data (Admin)

### Task 11: CRUD Guru + tarif

**Files:**
- Create: `app/(admin)/teachers/page.tsx`, `app/(admin)/teachers/[id]/page.tsx`, `components/teacher-form.tsx`, `components/teachers-table.tsx`, `lib/actions/teacher.ts`, `lib/validations/teacher.ts`

**Interfaces produced:** server actions `createTeacher`, `updateTeacher`, `setTeacherStatus`, semua memvalidasi dengan zod & memanggil `revalidatePath`. Membuat `User` GURU otomatis (email + password awal) saat guru dibuat.

**Steps:**
- [ ] **Step 1:** zod schema (`name`, `instruments[]`, `ratePerSession`, `phone`, `email`, `status`).
- [ ] **Step 2:** Server actions (create juga membuat `User` role GURU dengan password default, hash bcrypt).
- [ ] **Step 3:** Tabel guru (shadcn `table`) + tombol tambah/edit (`dialog` + `teacher-form`) + toggle status. Tarif per sesi terlihat & dapat diedit di sini (memenuhi "Kelola tarif guru").
- [ ] **Step 4:** Verifikasi manual: buat guru → muncul di tabel & bisa login.
- [ ] **Step 5:** Commit `feat: teacher CRUD and rates`.

### Task 12: CRUD Murid

**Files:**
- Create: `app/(admin)/students/page.tsx`, `components/student-form.tsx`, `components/students-table.tsx`, `lib/actions/student.ts`, `lib/validations/student.ts`

**Interfaces produced:** `createStudent`, `updateStudent`, `setStudentStatus`.

**Steps:**
- [ ] **Step 1:** zod schema (nama, orang tua, kontak, instrumen, level, target belajar, status).
- [ ] **Step 2:** Server actions + revalidate.
- [ ] **Step 3:** Tabel + form dialog + toggle status.
- [ ] **Step 4:** Verifikasi manual CRUD.
- [ ] **Step 5:** Commit `feat: student CRUD`.

---

## Phase 4 — Jadwal & Sesi

### Task 13: Kelola schedule (template mingguan) + validasi bentrok

**Files:**
- Create: `app/(admin)/schedules/page.tsx`, `components/schedule-form.tsx`, `components/schedules-table.tsx`, `lib/actions/schedule.ts`, `lib/validations/schedule.ts`

**Interfaces consumed:** `hasConflict` (Task 5).
**Interfaces produced:** `createSchedule`, `updateSchedule`, `toggleSchedule`. Create/update menolak bila `hasConflict` true terhadap schedule aktif lain di hari sama.

**Steps:**
- [ ] **Step 1:** zod schema (teacherId, studentId, instrument, dayOfWeek, startTime, durationMinutes).
- [ ] **Step 2:** Server action: muat schedule aktif hari sama → `hasConflict` → tolak dengan pesan bila bentrok.
- [ ] **Step 3:** UI tabel + form (select guru/murid, hari, jam, durasi).
- [ ] **Step 4:** Verifikasi manual: buat 2 schedule bentrok → ditolak.
- [ ] **Step 5:** Commit `feat: weekly schedule management with conflict validation`.

### Task 14: Generate sesi per periode

**Files:**
- Create: `app/(admin)/sessions/page.tsx`, `components/generate-sessions-dialog.tsx`, `components/sessions-table.tsx`, `lib/actions/session.ts`

**Interfaces consumed:** `planSessions` (Task 4).
**Interfaces produced:** `generateSessions(from, to)`, `updateSessionStatus`, `rescheduleSession`, `createAdHocSession`, `cancelSession`.

**Steps:**
- [ ] **Step 1:** `generateSessions`: ambil schedule aktif + kunci sesi existing → `planSessions` → `createMany`. Kembalikan jumlah dibuat.
- [ ] **Step 2:** UI: pilih rentang (default bulan berjalan), tombol Generate, tabel sesi (filter tanggal/guru/status).
- [ ] **Step 3:** Verifikasi manual: generate → sesi muncul; generate lagi rentang sama → tidak duplikat.
- [ ] **Step 4:** Commit `feat: generate sessions from schedules`.

### Task 15: Kalender jadwal (guru & murid)

**Files:**
- Create: `components/schedule-calendar.tsx`, `app/(admin)/schedules/calendar/page.tsx`, `app/(guru)/schedule/page.tsx`, `lib/queries/calendar.ts`

**Steps:**
- [ ] **Step 1:** `lib/queries/calendar.ts`: ambil sesi dalam rentang (admin: semua/filter; guru: `where teacherId = session.teacherId`).
- [ ] **Step 2:** Komponen kalender mingguan (grid hari × jam) menampilkan sesi berlabel murid/guru + status badge.
- [ ] **Step 3:** Admin lihat semua + filter guru/murid; Guru lihat miliknya.
- [ ] **Step 4:** Verifikasi manual kedua role.
- [ ] **Step 5:** Commit `feat: schedule calendar for admin and guru`.

---

## Phase 5 — Absensi, Lesson Report, Riwayat

### Task 16: Input absensi + reschedule/cancel (Guru & Admin)

**Files:**
- Create: `app/(guru)/sessions/page.tsx`, `components/attendance-controls.tsx`, `components/reschedule-dialog.tsx`
- Modify: `lib/actions/session.ts`

**Interfaces produced/used:** `updateSessionStatus(sessionId, status)`, `rescheduleSession(sessionId, newDate, newStartTime)` (set lama `RESCHEDULE`, buat sesi baru `SCHEDULED`, tautkan `rescheduledToId`; validasi bentrok sesi baru via `hasConflict`), `cancelSession(sessionId)`.

**Steps:**
- [ ] **Step 1:** Guarding: guru hanya boleh mengubah sesi miliknya (cek `session.teacherId === auth.teacherId`).
- [ ] **Step 2:** UI daftar sesi guru (hari ini + mendatang) dengan dropdown status; dialog reschedule (pilih tanggal/jam) & cancel (`alert-dialog`).
- [ ] **Step 3:** Verifikasi manual: set HADIR; reschedule membuat sesi baru & menandai lama; bentrok ditolak.
- [ ] **Step 4:** Commit `feat: attendance input, reschedule and cancel`.

### Task 17: Lesson report + upload media base64

**Files:**
- Create: `app/(guru)/sessions/[id]/report/page.tsx`, `components/lesson-report-form.tsx`, `components/attachment-uploader.tsx`, `lib/actions/lessonReport.ts`, `lib/validations/lessonReport.ts`, `lib/files.ts`

**Interfaces produced:** `upsertLessonReport(sessionId, data)`, `addAttachment(reportId, {type,filename,mimeType,dataBase64})`, `deleteAttachment(id)`. `lib/files.ts`: `fileToBase64` (client) + batas ukuran (mis. foto ≤2MB, video/audio ≤15MB) tervalidasi.

**Steps:**
- [ ] **Step 1:** zod schema report (material, target, result, homework, grade, notes).
- [ ] **Step 2:** Form report (autosave/submit) upsert per sessionId.
- [ ] **Step 3:** Uploader: baca file → base64 di client → kirim ke action; render preview (img untuk PHOTO, `<video>/<audio>` untuk lainnya) dari data URI; hapus attachment.
- [ ] **Step 4:** Guarding kepemilikan sesi.
- [ ] **Step 5:** Verifikasi manual: isi report + upload foto → tampil; reload tetap ada.
- [ ] **Step 6:** Commit `feat: lesson report and media attachments`.

### Task 18: Riwayat perkembangan murid (timeline) + riwayat mengajar guru

**Files:**
- Create: `app/(admin)/students/[id]/timeline/page.tsx`, `components/student-timeline.tsx`, `app/(guru)/reports/history/page.tsx`, `lib/queries/history.ts`

**Steps:**
- [ ] **Step 1:** `lib/queries/history.ts`: `getStudentTimeline(studentId)` (sesi + report + attachment urut tanggal), `getTeacherHistory(teacherId, filters)`.
- [ ] **Step 2:** Timeline murid: materi, nilai, catatan, dokumentasi (thumbnail).
- [ ] **Step 3:** Riwayat mengajar guru: daftar sesi lampau + status + link report.
- [ ] **Step 4:** Verifikasi manual.
- [ ] **Step 5:** Commit `feat: student progress timeline and teacher teaching history`.

---

## Phase 6 — Payroll & Export

### Task 19: Generate & kelola payroll

**Files:**
- Create: `app/(admin)/payroll/page.tsx`, `app/(admin)/payroll/[id]/page.tsx`, `components/payroll-table.tsx`, `components/generate-payroll-dialog.tsx`, `lib/actions/payroll.ts`

**Interfaces consumed:** `computePayroll` (Task 6).
**Interfaces produced:** `generatePayroll(teacherId, month, year)` (hitung sesi HADIR periode → upsert Payroll + items, guard sudah PAID tidak boleh regenerate), `setPayrollStatus(id, status)`.

**Steps:**
- [ ] **Step 1:** `generatePayroll`: query sesi HADIR guru dalam bulan/tahun → `computePayroll` dengan `ratePerSession` → transaksi buat Payroll+items+total. Upsert by unique (teacher, month, year).
- [ ] **Step 2:** UI: pilih guru+periode → generate; tabel payroll dengan status; halaman detail rincian per sesi; tombol Approve/Paid (DRAFT→APPROVED→PAID).
- [ ] **Step 3:** Verifikasi manual: generate cocok dengan jumlah sesi HADIR × tarif; transisi status.
- [ ] **Step 4:** Commit `feat: payroll generation and status workflow`.

### Task 20: Export PDF & Excel (payroll + laporan)

**Files:**
- Create: `lib/export/excel.ts`, `lib/export/pdf.tsx`, `app/api/export/payroll/[id]/route.ts`, `app/api/export/report/[type]/route.ts`

**Interfaces produced:** route handler mengembalikan file (`Content-Disposition: attachment`). Excel via `exceljs`, PDF via `@react-pdf/renderer` (`renderToBuffer`).

**Steps:**
- [ ] **Step 1:** Install `npm i exceljs @react-pdf/renderer`.
- [ ] **Step 2:** `excel.ts`: fungsi buat workbook payroll (header guru/periode, baris per sesi, total). `pdf.tsx`: dokumen payroll.
- [ ] **Step 3:** Route handlers `?format=pdf|excel` untuk payroll id.
- [ ] **Step 4:** Tombol export di halaman payroll detail.
- [ ] **Step 5:** Verifikasi manual: unduh PDF & Excel, isi benar.
- [ ] **Step 6:** Commit `feat: pdf and excel export for payroll`.

---

## Phase 7 — Dashboard & Laporan

### Task 21: Dashboard Admin & Guru

**Files:**
- Modify: `app/(admin)/dashboard/page.tsx`, `app/(guru)/dashboard/page.tsx`
- Create: `lib/queries/dashboard.ts`, `components/stat-card.tsx`

**Interfaces produced:** `getAdminDashboard()` (total murid aktif, total guru aktif, sesi hari ini, ringkasan payroll periode), `getGuruDashboard(teacherId)` (sesi hari ini, estimasi honor = sesi HADIR bulan berjalan × tarif, ringkasan progress murid).

**Steps:**
- [ ] **Step 1:** Query dashboard.
- [ ] **Step 2:** UI kartu statistik + daftar sesi hari ini.
- [ ] **Step 3:** Verifikasi manual angka konsisten dengan data seed.
- [ ] **Step 4:** Commit `feat: admin and guru dashboards`.

### Task 22: Laporan (rekap) + export

**Files:**
- Create: `app/(admin)/reports/page.tsx`, `components/report-filters.tsx`, `lib/queries/reports.ts`
- Modify: `lib/export/excel.ts`, `lib/export/pdf.tsx`

**Interfaces produced:** `getAttendanceRecap(filters)`, `getTeachingHoursRecap(filters)`, `getStudentProgressRecap(filters)`, `getPayrollRecap(filters)`.

**Steps:**
- [ ] **Step 1:** Query rekap dengan filter periode/guru/murid.
- [ ] **Step 2:** UI tab: Rekap absensi, Jam mengajar, Perkembangan murid, Payroll — tabel + filter.
- [ ] **Step 3:** Tombol export PDF/Excel per rekap (extend export lib).
- [ ] **Step 4:** Verifikasi manual.
- [ ] **Step 5:** Commit `feat: reports with recap and export`.

---

## Phase 8 — Finishing

### Task 23: Root redirect, README, verifikasi menyeluruh

**Files:**
- Modify: `app/page.tsx`
- Create: `README.md`

**Steps:**
- [ ] **Step 1:** `app/page.tsx` redirect ke `/login` (atau dashboard bila sudah login).
- [ ] **Step 2:** README: cara setup (`.env`, `db:push`, `db:seed`, `dev`), kredensial default, ringkasan fitur.
- [ ] **Step 3:** Jalankan `npm test` (semua domain test hijau) + `npm run build` (sukses).
- [ ] **Step 4:** Verifikasi manual end-to-end sesuai spec bagian 8 (login → CRUD → jadwal → generate sesi → absensi → report+upload → timeline → payroll generate/approve → export → dashboard & laporan).
- [ ] **Step 5:** Commit `docs: add README and finalize`.

---

## Self-Review — Spec Coverage

- User Management (Admin/Guru) → Task 7,8,10,11 (guru punya user login)
- Master Data Murid → Task 12; Guru → Task 11; Instrumen → field string di guru/murid + select preset (dicantumkan di form Task 11/12)
- Jadwal Les (mingguan, reschedule, cancel, kalender, validasi bentrok) → Task 13,14,15,16
- Absensi (5 status) → Task 16 (+ SCHEDULED sebagai awal)
- Lesson Report (materi/target/hasil/homework/penilaian/upload foto+video/audio) → Task 17
- Riwayat perkembangan murid → Task 18
- Payroll (generate, detail per sesi, status Draft/Approved/Paid, export) → Task 19,20
- Dashboard Admin & Guru → Task 21
- Laporan (rekap absensi/jam mengajar/perkembangan/payroll) → Task 22
- Roadmap (bagian 10) → sengaja out of scope

Semua requirement inti memiliki task. Tidak ada placeholder tersisa; tipe antar-task konsisten (`planSessions`, `hasConflict`, `computePayroll`, action names).
