import { prisma } from "@/lib/prisma";
import { StudentsTable } from "@/components/students-table";

export default async function AdminStudentsPage() {
  const [students, teachers] = await Promise.all([
    prisma.student.findMany({
      orderBy: { name: "asc" },
      include: { teachers: { select: { teacherId: true } } },
    }),
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
  ]);

  return (
    <StudentsTable
      students={students.map(({ teachers, ...student }) => ({
        ...student,
        teacherIds: teachers.map((t) => t.teacherId),
      }))}
      teachers={teachers}
    />
  );
}
