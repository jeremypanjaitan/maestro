import { notFound } from "next/navigation";

import { getStudentTimeline } from "@/lib/queries/history";
import { PageHeader } from "@/components/page-header";
import { StudentTimeline } from "@/components/student-timeline";

type StudentTimelinePageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Admin-facing progress timeline for one student.
 *
 * SECURITY: `getStudentTimeline` re-derives role/teacherId from `auth()`
 * itself (ADMIN: any student; GURU: only a student they actually teach), so
 * this page doesn't need its own guard beyond the `app/admin/layout.tsx`
 * role check -- an unauthorized result maps to `notFound()` uniformly.
 */
export default async function StudentTimelinePage({ params }: StudentTimelinePageProps) {
  const { id } = await params;

  const result = await getStudentTimeline(id);
  if (!result.ok) {
    notFound();
  }

  const { student, entries } = result.timeline;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Riwayat Perkembangan — ${student.name}`}
        description={student.instrument}
      />

      <StudentTimeline entries={entries} />
    </div>
  );
}
