import { getStudentsForGuru } from "@/lib/queries/calendar";
import { GuruStudentsTable } from "@/components/guru-students-table";
import { PageHeader } from "@/components/page-header";

/**
 * The signed-in guru's own murid, each linking to their progress timeline.
 *
 * SECURITY: scoping to the guru's own `teacherId` happens inside
 * `getStudentsForGuru`, re-derived from `auth()` there — no id is passed
 * from this page, so it can't leak another teacher's students.
 */
export default async function GuruStudentsPage() {
  const students = await getStudentsForGuru();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Murid"
        description="Murid yang Anda ajar. Buka Riwayat untuk melihat perkembangan latihannya."
      />

      <GuruStudentsTable students={students} />
    </div>
  );
}
