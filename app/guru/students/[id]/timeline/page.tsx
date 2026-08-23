import { notFound } from "next/navigation";

import { getStudentTimeline } from "@/lib/queries/history";
import { PageHeader } from "@/components/page-header";
import { StudentTimeline } from "@/components/student-timeline";

type GuruStudentTimelinePageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Guru-facing progress timeline for one of their own students. The guru-side
 * mirror of `app/admin/students/[id]/timeline/page.tsx`.
 *
 * SECURITY: `getStudentTimeline` re-derives role/teacherId from `auth()`
 * itself and, for a GURU caller, only allows a student linked to them by a
 * schedule or a session. A guru who guesses another teacher's student id
 * gets `notFound()` — "not found" is used uniformly rather than a distinct
 * "forbidden" page, so this route never reveals whether an id exists.
 */
export default async function GuruStudentTimelinePage({
  params,
}: GuruStudentTimelinePageProps) {
  const { id } = await params;

  const result = await getStudentTimeline(id);
  if (!result.ok) {
    notFound();
  }

  const { student, entries } = result.timeline;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Riwayat Latihan — ${student.name}`}
        description={student.instrument}
      />

      <StudentTimeline entries={entries} />
    </div>
  );
}
