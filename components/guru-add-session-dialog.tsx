"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ClassType } from "@prisma/client";

import { createGuruSession } from "@/lib/actions/session";
import { CLASS_TYPE_LABELS } from "@/lib/domain/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY = {
  studentId: "",
  classType: "PRIVATE" as ClassType,
  dateISO: "",
  startTime: "",
  durationMinutes: "60",
};

/**
 * Lets a guru create a one-off session for one of their own students. Mirrors
 * the admin `AddSessionDialog` but without teacher/pricing fields: the teacher
 * is the signed-in guru (set server-side), and there is no price input (see
 * `createGuruSession` — rate resolves to 0, admin sets honor later).
 */
export function GuruAddSessionDialog({
  students,
}: {
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    const result = await createGuruSession({
      studentId: form.studentId,
      classType: form.classType,
      dateISO: form.dateISO,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
    });
    setIsPending(false);
    if (result.ok) {
      toast.success("Sesi berhasil dibuat");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={students.length === 0}>
          <Plus className="size-4" />
          Tambah Sesi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Sesi</DialogTitle>
          <DialogDescription>
            Buat satu sesi untuk murid Anda pada tanggal tertentu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Murid</Label>
            <Select
              value={form.studentId}
              onValueChange={(v) => set("studentId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih murid" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Tipe Kelas</Label>
            <Select
              value={form.classType}
              onValueChange={(v) => set("classType", v as ClassType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CLASS_TYPE_LABELS) as ClassType[]).map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {CLASS_TYPE_LABELS[ct]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="gs-date">Tanggal</Label>
              <Input
                id="gs-date"
                type="date"
                value={form.dateISO}
                onChange={(e) => set("dateISO", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gs-time">Jam Mulai</Label>
              <Input
                id="gs-time"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gs-duration">Durasi (menit)</Label>
            <Input
              id="gs-duration"
              type="number"
              min={15}
              step={15}
              inputMode="numeric"
              value={form.durationMinutes}
              onChange={(e) => set("durationMinutes", e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
