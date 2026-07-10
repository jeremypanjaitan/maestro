export type MeetingSessionInput = {
  sessionId: string
  studentId: string
  teacherId: string
  date: string
  startTime: string
  status: string
}

/**
 * Computes "pertemuan ke-N" (meeting number) per (studentId, teacherId) pair.
 *
 * Within each pair's sessions: RESCHEDULE and CANCEL sessions are filtered
 * out first (they don't count as, and don't consume, a meeting number), then
 * the remainder is ordered by (date, startTime) and assigned a 1-based
 * index.
 *
 * RESCHEDULE/CANCEL sessions are intentionally left OUT of the returned map
 * (no entry) rather than given 0 — callers should treat "not in the map" as
 * "no meeting number applies," which is simpler than distinguishing a
 * sentinel 0 from a real first meeting.
 */
export function assignMeetingNumbers(sessions: MeetingSessionInput[]): Map<string, number> {
  const result = new Map<string, number>()

  const groups = new Map<string, MeetingSessionInput[]>()
  for (const session of sessions) {
    const key = `${session.studentId}|${session.teacherId}`
    const group = groups.get(key)
    if (group) {
      group.push(session)
    } else {
      groups.set(key, [session])
    }
  }

  for (const group of groups.values()) {
    const countable = group.filter(
      (s) => s.status !== 'RESCHEDULE' && s.status !== 'CANCEL'
    )
    countable.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1
      return 0
    })
    countable.forEach((session, index) => {
      result.set(session.sessionId, index + 1)
    })
  }

  return result
}
