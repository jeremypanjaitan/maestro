import { PrismaClient, SessionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

import { planSessions, type ScheduleInput } from "../lib/domain/generateSessions";
import { computePayroll } from "../lib/domain/payroll";
import { toDbDate } from "../lib/domain/dbDate";

const prisma = new PrismaClient();

// A tiny valid 1x1 transparent PNG, base64-encoded.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Parses a "YYYY-MM-DD" string into a local Date (avoids the UTC-parsing
 * behavior of `new Date("YYYY-MM-DD")`, which would shift the date in
 * timezones behind UTC).
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

async function main() {
  console.log("Seeding database...");

  // ---------------------------------------------------------------------
  // 1. Wipe domain data (FK-safe order) + non-admin users, then recreate.
  //    Admin user is upserted so its id (and anything referencing it, were
  //    there any) stays stable across re-runs.
  // ---------------------------------------------------------------------
  await prisma.$transaction([
    prisma.payrollItem.deleteMany(),
    prisma.payroll.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.lessonReport.deleteMany(),
    prisma.session.deleteMany(),
    prisma.schedule.deleteMany(),
    prisma.student.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.user.deleteMany({ where: { role: "GURU" } }),
  ]);

  // ---------------------------------------------------------------------
  // 2. Admin user (upsert on email — idempotent, stable id).
  // ---------------------------------------------------------------------
  const adminEmail = "admin@maestro.test";
  const adminPassword = "admin123";
  const adminPasswordHash = await hashPassword(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "Admin Maestro", passwordHash: adminPasswordHash, role: "ADMIN" },
    create: {
      name: "Admin Maestro",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  // ---------------------------------------------------------------------
  // 3. Guru (Teacher + linked User), 3 of them.
  // ---------------------------------------------------------------------
  const guruPassword = "guru123";
  const guruPasswordHash = await hashPassword(guruPassword);

  // Teachers no longer carry any rate — pay is package-based, set
  // per-enrollment on `Schedule.packagePrice`/`packageSessions` (see
  // scheduleSeeds below, where package prices vary per student).
  const guruSeeds = [
    { name: "Budi Santoso", email: "budi@maestro.test", instruments: ["Piano"], phone: "081200000001" },
    { name: "Siti Aminah", email: "siti@maestro.test", instruments: ["Guitar"], phone: "081200000002" },
    { name: "Rian Pratama", email: "rian@maestro.test", instruments: ["Drum", "Vocal"], phone: "081200000003" },
  ];

  const teachers = [];
  for (const g of guruSeeds) {
    const user = await prisma.user.create({
      data: {
        name: g.name,
        email: g.email,
        passwordHash: guruPasswordHash,
        role: "GURU",
      },
    });
    const teacher = await prisma.teacher.create({
      data: {
        name: g.name,
        instruments: g.instruments,
        phone: g.phone,
        status: "ACTIVE",
        userId: user.id,
      },
    });
    teachers.push(teacher);
  }
  const [teacherBudi, teacherSiti, teacherRian] = teachers;

  // ---------------------------------------------------------------------
  // 4. Students, 8 of them, varied instrument/level.
  // ---------------------------------------------------------------------
  const studentSeeds = [
    { name: "Andi Wijaya", instrument: "Piano", level: "Pemula", parentName: "Bapak Wijaya", contact: "081300000001", learningTarget: "Menguasai skala mayor" },
    { name: "Bella Putri", instrument: "Piano", level: "Menengah", parentName: "Ibu Putri", contact: "081300000002", learningTarget: "Memainkan lagu klasik sederhana" },
    { name: "Citra Dewi", instrument: "Guitar", level: "Pemula", parentName: "Bapak Dewi", contact: "081300000003", learningTarget: "Chord dasar" },
    { name: "Dian Saputra", instrument: "Guitar", level: "Menengah", parentName: "Ibu Saputra", contact: "081300000004", learningTarget: "Fingerstyle dasar" },
    { name: "Eka Nugraha", instrument: "Drum", level: "Pemula", parentName: "Bapak Nugraha", contact: "081300000005", learningTarget: "Ketukan dasar 4/4" },
    { name: "Fajar Ramadhan", instrument: "Drum", level: "Mahir", parentName: "Ibu Ramadhan", contact: "081300000006", learningTarget: "Improvisasi fill-in" },
    { name: "Gita Lestari", instrument: "Vocal", level: "Pemula", parentName: "Bapak Lestari", contact: "081300000007", learningTarget: "Teknik pernapasan" },
    { name: "Hendra Kusuma", instrument: "Vocal", level: "Menengah", parentName: "Ibu Kusuma", contact: "081300000008", learningTarget: "Kontrol pitch" },
    // Group-class students (see scheduleSeeds): all three take Piano GROUP
    // lessons with Budi at the same dayOfWeek + startTime — exercises the
    // relaxed conflict rule (same teacher + overlapping time is OK when
    // every side is GROUP).
    { name: "Kevin Halim", instrument: "Piano", level: "Pemula", parentName: "Bapak Halim", contact: "081300000009", learningTarget: "Bermain dalam kelompok" },
    { name: "Laras Ayu", instrument: "Piano", level: "Pemula", parentName: "Ibu Ayu", contact: "081300000010", learningTarget: "Bermain dalam kelompok" },
    { name: "Made Wirawan", instrument: "Piano", level: "Pemula", parentName: "Bapak Wirawan", contact: "081300000011", learningTarget: "Bermain dalam kelompok" },
  ];

  const students = [];
  for (const s of studentSeeds) {
    const student = await prisma.student.create({
      data: {
        name: s.name,
        parentName: s.parentName,
        contact: s.contact,
        instrument: s.instrument,
        level: s.level,
        learningTarget: s.learningTarget,
        status: "ACTIVE",
      },
    });
    students.push(student);
  }
  const [andi, bella, citra, dian, eka, fajar, gita, hendra, kevin, laras, made] = students;

  // ---------------------------------------------------------------------
  // 5. Weekly schedules. dayOfWeek: 0=Sun..6=Sat, brief uses 1-5 (Mon-Fri).
  //    No two schedules for the same teacher OR same student overlap on
  //    the same dayOfWeek + startTime.
  // ---------------------------------------------------------------------
  const scheduleSeeds = [
    // Budi (Piano) — Andi (standard package), Bella (discounted/"special"
    // package — same teacher/instrument, independent package per enrollment).
    { teacher: teacherBudi, student: andi, instrument: "Piano", dayOfWeek: 1, startTime: "15:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 900000, packageSessions: 4 },
    { teacher: teacherBudi, student: bella, instrument: "Piano", dayOfWeek: 3, startTime: "16:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 600000, packageSessions: 4 },
    // Siti (Guitar) — Citra, Dian, both standard package.
    { teacher: teacherSiti, student: citra, instrument: "Guitar", dayOfWeek: 2, startTime: "15:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 900000, packageSessions: 4 },
    { teacher: teacherSiti, student: dian, instrument: "Guitar", dayOfWeek: 4, startTime: "16:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 900000, packageSessions: 4 },
    // Rian (Drum, Vocal) — Eka, Fajar, Gita, Hendra, all standard package.
    { teacher: teacherRian, student: eka, instrument: "Drum", dayOfWeek: 1, startTime: "17:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 900000, packageSessions: 4 },
    { teacher: teacherRian, student: fajar, instrument: "Drum", dayOfWeek: 5, startTime: "15:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 900000, packageSessions: 4 },
    { teacher: teacherRian, student: gita, instrument: "Vocal", dayOfWeek: 2, startTime: "16:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 900000, packageSessions: 4 },
    { teacher: teacherRian, student: hendra, instrument: "Vocal", dayOfWeek: 4, startTime: "17:00", durationMinutes: 60, classType: "PRIVATE" as const, packagePrice: 900000, packageSessions: 4 },
    // GROUP class: Budi teaches Kevin, Laras, and Made together — same
    // teacher + same dayOfWeek + same startTime, each their own
    // enrollment/session, each paid the package's per-session rate. This is
    // the relaxed-conflict case: multiple GROUP schedules for the same
    // teacher at the same slot are allowed (no same-student, no PRIVATE
    // overlap involved), unlike two PRIVATE schedules which would conflict.
    { teacher: teacherBudi, student: kevin, instrument: "Piano", dayOfWeek: 2, startTime: "10:00", durationMinutes: 60, classType: "GROUP" as const, packagePrice: 500000, packageSessions: 4 },
    { teacher: teacherBudi, student: laras, instrument: "Piano", dayOfWeek: 2, startTime: "10:00", durationMinutes: 60, classType: "GROUP" as const, packagePrice: 500000, packageSessions: 4 },
    { teacher: teacherBudi, student: made, instrument: "Piano", dayOfWeek: 2, startTime: "10:00", durationMinutes: 60, classType: "GROUP" as const, packagePrice: 500000, packageSessions: 4 },
  ];

  const schedules = [];
  for (const s of scheduleSeeds) {
    const schedule = await prisma.schedule.create({
      data: {
        teacherId: s.teacher.id,
        studentId: s.student.id,
        instrument: s.instrument,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        durationMinutes: s.durationMinutes,
        classType: s.classType,
        packagePrice: s.packagePrice,
        packageSessions: s.packageSessions,
        active: true,
      },
    });
    schedules.push(schedule);
  }

  // ---------------------------------------------------------------------
  // 6. Generate sessions for the CURRENT month via planSessions.
  // ---------------------------------------------------------------------
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const scheduleInputs: ScheduleInput[] = schedules.map((s) => ({
    id: s.id,
    teacherId: s.teacherId,
    studentId: s.studentId,
    instrument: s.instrument,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    classType: s.classType,
    packagePrice: s.packagePrice,
    packageSessions: s.packageSessions,
  }));

  const planned = planSessions(scheduleInputs, firstDay, lastDay, new Set());

  // Decide status per planned session: HADIR for past dates, SCHEDULED for
  // future/today, with a couple of MURID_TIDAK_HADIR / CANCEL sprinkled in
  // among the past sessions.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let sprinkleCounter = 0;
  const plannedWithStatus = planned.map((p) => {
    const sessionDate = parseLocalDate(p.date);
    let status: SessionStatus;
    if (sessionDate < today) {
      sprinkleCounter += 1;
      if (sprinkleCounter % 7 === 0) {
        status = "MURID_TIDAK_HADIR";
      } else if (sprinkleCounter % 11 === 0) {
        status = "CANCEL";
      } else {
        status = "HADIR";
      }
    } else {
      status = "SCHEDULED";
    }
    return { ...p, status };
  });

  await prisma.session.createMany({
    data: plannedWithStatus.map((p) => ({
      scheduleId: p.scheduleId,
      teacherId: p.teacherId,
      studentId: p.studentId,
      date: toDbDate(p.date),
      startTime: p.startTime,
      durationMinutes: p.durationMinutes,
      classType: p.classType,
      rate: p.rate,
      packagePrice: p.packagePrice,
      packageSessions: p.packageSessions,
      status: p.status,
    })),
  });

  const allSessions = await prisma.session.findMany({ orderBy: { date: "asc" } });
  const hadirSessions = allSessions.filter((s) => s.status === "HADIR");

  // ---------------------------------------------------------------------
  // 7. Lesson reports for ~5 HADIR sessions, with 1 attachment.
  // ---------------------------------------------------------------------
  const reportTargets = hadirSessions.slice(0, 5);
  const reportSeeds = [
    { material: "Skala C Mayor", target: "Hafal urutan tuts", result: "Sudah lancar naik-turun", homework: "Latihan 15 menit/hari", grade: "B+", notes: "Perlu perbaiki posisi jari" },
    { material: "Chord dasar G, C, D", target: "Perpindahan chord halus", result: "Masih tersendat di transisi", homework: "Latihan perpindahan chord", grade: "B", notes: "Progress baik" },
    { material: "Ketukan 4/4 dasar", target: "Konsistensi tempo", result: "Tempo cukup stabil", homework: "Latihan metronome 60bpm", grade: "A-", notes: "Sangat disiplin" },
    { material: "Teknik pernapasan diafragma", target: "Napas panjang saat menyanyi", result: "Sudah mulai terasa perbedaannya", homework: "Latihan napas 10 menit/hari", grade: "B", notes: "Perlu konsistensi" },
    { material: "Fingerstyle dasar", target: "Petik jari terpisah", result: "Masih perlu latihan koordinasi", homework: "Latihan fingerpicking pattern 1", grade: "C+", notes: "Semangat tinggi" },
  ];

  let attachmentCreated = false;
  for (let i = 0; i < reportTargets.length; i++) {
    const session = reportTargets[i];
    const seed = reportSeeds[i % reportSeeds.length];
    const report = await prisma.lessonReport.create({
      data: {
        sessionId: session.id,
        material: seed.material,
        target: seed.target,
        result: seed.result,
        homework: seed.homework,
        grade: seed.grade,
        notes: seed.notes,
      },
    });

    if (i === 0) {
      await prisma.attachment.create({
        data: {
          lessonReportId: report.id,
          type: "PHOTO",
          filename: "sample.png",
          mimeType: "image/png",
          dataBase64: TINY_PNG_BASE64,
        },
      });
      attachmentCreated = true;
    }
  }

  // ---------------------------------------------------------------------
  // 8. Payroll DRAFT for one teacher (Budi) for the current month.
  // ---------------------------------------------------------------------
  const budiHadirSessions = hadirSessions.filter((s) => s.teacherId === teacherBudi.id);
  const payrollComputation = computePayroll(
    budiHadirSessions.map((s) => ({ sessionId: s.id, status: s.status, rate: s.rate })),
  );

  const payroll = await prisma.payroll.create({
    data: {
      teacherId: teacherBudi.id,
      periodMonth: now.getMonth() + 1,
      periodYear: now.getFullYear(),
      status: "DRAFT",
      total: payrollComputation.total,
      items: {
        create: payrollComputation.items.map((item) => ({
          sessionId: item.sessionId,
          rate: item.rate,
        })),
      },
    },
    include: { items: true },
  });

  // ---------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------
  const counts = {
    users: await prisma.user.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    schedules: await prisma.schedule.count(),
    sessions: await prisma.session.count(),
    hadirSessions: hadirSessions.length,
    lessonReports: await prisma.lessonReport.count(),
    attachments: await prisma.attachment.count(),
    payrolls: await prisma.payroll.count(),
  };

  const budiRateSum = budiHadirSessions.reduce((sum, s) => sum + s.rate, 0);

  console.log("\n=== Seed complete ===");
  console.log(`Admin login:  email=${admin.email}  password=${adminPassword}`);
  console.log(`Guru logins:  ${guruSeeds.map((g) => g.email).join(", ")}  password=${guruPassword}`);
  console.log("\nCounts:");
  console.table(counts);
  console.log(
    `Quick check — Budi HADIR session rate sum = ${budiRateSum}, payroll.total = ${payroll.total} (match: ${budiRateSum === payroll.total})`,
  );
  console.log(`Attachment created: ${attachmentCreated}`);
  console.log(
    `Payroll DRAFT: teacher=${teacherBudi.name} periodMonth=${payroll.periodMonth} periodYear=${payroll.periodYear} total=${payroll.total} items=${payroll.items.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
