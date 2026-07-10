# Maestro — Music School Management App

Maestro adalah aplikasi manajemen sekolah musik untuk mengelola guru (guru/pengajar),
murid, jadwal les mingguan, sesi, absensi, laporan les (lesson report), riwayat
perkembangan murid, payroll guru, dashboard, dan laporan/rekap operasional.

Ada dua peran pengguna:

- **ADMIN** — mengelola data master (guru, murid), jadwal, sesi, payroll, dan laporan.
- **GURU** — melihat jadwal & sesi miliknya, mengisi absensi, membuat lesson report,
  dan melihat riwayat pembayaran (payroll) miliknya.

## Tech Stack

- **Next.js 15** (App Router, React 19, Server Components + Server Actions)
- **NextAuth v5** (Credentials provider, JWT session, role-based middleware)
- **Prisma ORM** + **PostgreSQL**
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **react-hook-form** + **zod** for form validation
- **@react-pdf/renderer** and **exceljs** for PDF/Excel export (payroll, reports)
- **Vitest** for domain unit tests

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (a running database instance/connection string)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root (copy from `.env.example` if present)
   with at least:

   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/maestro"
   AUTH_SECRET="a-long-random-secret-string"
   ```

   - `DATABASE_URL` — PostgreSQL connection string used by Prisma.
   - `AUTH_SECRET` — secret used by NextAuth to sign session JWTs (generate one
     with `npx auth secret` or `openssl rand -base64 32`).

3. Push the Prisma schema to the database:

   ```bash
   npm run db:push
   ```

4. Seed the database with initial data (admin user, sample teachers/students,
   schedules, etc.):

   ```bash
   npm run db:seed
   ```

5. Run the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000` (or the next free port,
   e.g. `3001`, if `3000` is taken).

## Default Seeded Credentials

| Role  | Email               | Password |
| ----- | ------------------- | -------- |
| ADMIN | admin@maestro.test  | admin123 |
| GURU  | budi@maestro.test   | guru123  |
| GURU  | siti@maestro.test   | guru123  |
| GURU  | rian@maestro.test   | guru123  |

Visiting `/` redirects unauthenticated users to `/login`, ADMIN users to
`/admin/dashboard`, and GURU users to `/guru/dashboard`.

## Feature Summary

| Feature (requirement)                                            | Where in the app                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| User management (Admin & Guru login, roles)                       | `/login`, credentials auth, role-based middleware/route groups        |
| Master data — Guru (teacher)                                      | `/admin/teachers` — CRUD, instruments, rate per session               |
| Master data — Murid (student)                                     | `/admin/students` — CRUD                                              |
| Jadwal les mingguan + validasi bentrok (conflict validation)       | `/admin/schedules`, `/admin/schedules/calendar`, `/guru/schedule`      |
| Generate sesi dari jadwal                                          | `/admin/sessions` (session generation from weekly schedules)          |
| Absensi (5 status) + reschedule/cancel                             | `/admin/sessions`, `/guru/sessions` (attendance, reschedule, cancel)   |
| Lesson report (materi/target/hasil/homework/penilaian + media)    | `/guru/sessions/[id]` — report form with base64 photo/video/audio     |
| Riwayat perkembangan murid & riwayat mengajar guru                 | student timeline, `/guru/reports/history`                             |
| Payroll (generate, detail per sesi, status Draft/Approved/Paid)   | `/admin/payroll`, `/admin/payroll/[id]` — generate/approve + export    |
| Dashboard Admin & Guru                                             | `/admin/dashboard`, `/guru/dashboard`                                  |
| Laporan / rekap (absensi, jam mengajar, perkembangan, payroll)    | `/admin/reports` — recap views with export                            |

## Media Storage

Uploaded lesson-report media (photo/video/audio attachments) are stored as
**base64-encoded strings directly in the database** (no external object
storage/CDN is used in this version).

## Testing

Run the domain-level unit test suite (business logic: scheduling conflicts,
session planning, payroll computation, etc.):

```bash
npm test
```

Other useful commands:

```bash
npx tsc --noEmit   # type-check the whole project
npm run build      # production build
npm run lint       # lint
```
