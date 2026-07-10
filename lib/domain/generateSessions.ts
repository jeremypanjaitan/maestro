export type ScheduleInput = {
  id: string;
  teacherId: string;
  studentId: string;
  instrument: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
};

export type PlannedSession = {
  scheduleId: string;
  teacherId: string;
  studentId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
};

/**
 * Formats a Date to "YYYY-MM-DD" local date string (not ISO).
 * Uses getFullYear, getMonth, getDate to avoid timezone shifts.
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates planned sessions from recurring schedules within a date range.
 * Idempotent: skips sessions whose key (scheduleId|YYYY-MM-DD) exists in existingKeys.
 *
 * @param schedules - Array of recurring schedule definitions
 * @param from - Start date (inclusive)
 * @param to - End date (inclusive)
 * @param existingKeys - Set of already-generated session keys to skip (format: "scheduleId|YYYY-MM-DD")
 * @returns Array of planned sessions
 */
export function planSessions(
  schedules: ScheduleInput[],
  from: Date,
  to: Date,
  existingKeys: Set<string>
): PlannedSession[] {
  const sessions: PlannedSession[] = [];

  // Iterate through each schedule
  for (const schedule of schedules) {
    // Clone the from date and iterate day by day
    const current = new Date(from);

    while (current <= to) {
      // Check if this date matches the schedule's day of week
      if (current.getDay() === schedule.dayOfWeek) {
        const dateStr = formatLocalDate(current);
        const key = `${schedule.id}|${dateStr}`;

        // Only add if not already existing (idempotent)
        if (!existingKeys.has(key)) {
          sessions.push({
            scheduleId: schedule.id,
            teacherId: schedule.teacherId,
            studentId: schedule.studentId,
            date: dateStr,
            startTime: schedule.startTime,
            durationMinutes: schedule.durationMinutes
          });
        }
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }
  }

  return sessions;
}
