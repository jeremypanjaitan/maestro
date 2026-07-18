"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Teacher picker for the admin honor page. Selecting a teacher navigates to
 * `/admin/honor?teacherId=<id>`, which re-renders the server page with that
 * teacher's session status and payment history.
 */
export function HonorTeacherSelect({
  teachers,
  value,
}: {
  teachers: { id: string; name: string }[];
  value: string | null;
}) {
  const router = useRouter();

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(id) => router.push(`/admin/honor?teacherId=${id}`)}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Pilih guru" />
      </SelectTrigger>
      <SelectContent>
        {teachers.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
