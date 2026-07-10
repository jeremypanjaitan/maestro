import { prisma } from "@/lib/prisma";
import { TeachersTable } from "@/components/teachers-table";

export default async function AdminTeachersPage() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { name: "asc" },
    include: { user: { select: { email: true } } },
  });

  return <TeachersTable teachers={teachers} />;
}
