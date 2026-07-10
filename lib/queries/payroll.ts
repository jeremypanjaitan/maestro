import { prisma } from "@/lib/prisma";
import { formatDbDate } from "@/lib/domain/dbDate";
import { assignMeetingNumbers } from "@/lib/domain/meeting";

/**
 * Computes "pertemuan ke-N" (meeting number) for every session belonging to
 * `teacherId`, keyed by sessionId.
 *
 * Meeting numbers are assigned per (studentId, teacherId) pair ordered by
 * (date, startTime) — see `assignMeetingNumbers`. To number a payroll's
 * sessions correctly we must count against the teacher's FULL session
 * history (across all periods), not just the sessions inside one payroll,
 * otherwise "pertemuan ke-N" would reset every period instead of reflecting
 * how many times that student has actually met that teacher.
 */
export async function getMeetingNumbersForTeacher(
  teacherId: string,
): Promise<Map<string, number>> {
  const sessions = await prisma.session.findMany({
    where: { teacherId },
    select: {
      id: true,
      studentId: true,
      teacherId: true,
      date: true,
      startTime: true,
      status: true,
    },
  });

  return assignMeetingNumbers(
    sessions.map((s) => ({
      sessionId: s.id,
      studentId: s.studentId,
      teacherId: s.teacherId,
      date: formatDbDate(s.date),
      startTime: s.startTime,
      status: s.status,
    })),
  );
}
