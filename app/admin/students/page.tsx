import { prisma } from "@/lib/prisma";
import { StudentsTable } from "@/components/students-table";

export default async function AdminStudentsPage() {
  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
  });

  return <StudentsTable students={students} />;
}
