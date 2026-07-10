"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { upsertLessonReport } from "@/lib/actions/lessonReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type LessonReportRecord = {
  material: string | null;
  target: string | null;
  result: string | null;
  homework: string | null;
  grade: string | null;
  notes: string | null;
};

type LessonReportFormProps = {
  sessionId: string;
  /** Existing report to prefill, or `null` if none has been saved yet. */
  report?: LessonReportRecord | null;
};

const EMPTY_FORM = {
  material: "",
  target: "",
  result: "",
  homework: "",
  grade: "",
  notes: "",
};

function toFormState(report?: LessonReportRecord | null) {
  if (!report) return EMPTY_FORM;
  return {
    material: report.material ?? "",
    target: report.target ?? "",
    result: report.result ?? "",
    homework: report.homework ?? "",
    grade: report.grade ?? "",
    notes: report.notes ?? "",
  };
}

/**
 * Report form for a single session: material/target/result/homework/grade
 * /notes, upserted (one row per session, `sessionId` is `@unique`) via
 * `upsertLessonReport`. Works for both the first save (creates the
 * LessonReport row) and every subsequent edit.
 *
 * On successful save this calls `router.refresh()` so the parent server
 * component re-fetches the report -- in particular so `AttachmentUploader`
 * (rendered by the same page) picks up the freshly-created `reportId` on
 * the very first save, before which no attachments can be added.
 */
export function LessonReportForm({ sessionId, report }: LessonReportFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(toFormState(report));
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setForm(toFormState(report));
  }, [report]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const result = await upsertLessonReport(sessionId, form);

    setIsPending(false);

    if (result.ok) {
      toast.success("Laporan tersimpan");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="material">Materi</Label>
        <Textarea
          id="material"
          value={form.material}
          onChange={(e) => setForm((prev) => ({ ...prev, material: e.target.value }))}
          placeholder="Materi yang diajarkan pada sesi ini"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="target">Target</Label>
        <Textarea
          id="target"
          value={form.target}
          onChange={(e) => setForm((prev) => ({ ...prev, target: e.target.value }))}
          placeholder="Target yang ingin dicapai"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="result">Hasil</Label>
        <Textarea
          id="result"
          value={form.result}
          onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
          placeholder="Hasil / perkembangan murid"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="homework">PR</Label>
        <Textarea
          id="homework"
          value={form.homework}
          onChange={(e) => setForm((prev) => ({ ...prev, homework: e.target.value }))}
          placeholder="Tugas untuk dikerjakan di rumah"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="grade">Nilai</Label>
        <Input
          id="grade"
          value={form.grade}
          onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
          placeholder="Contoh: A, 85"
          className="sm:max-w-32"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Catatan tambahan (opsional)"
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan Laporan"}
        </Button>
      </div>
    </form>
  );
}
