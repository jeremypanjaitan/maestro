"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ClassType } from "@prisma/client";

import { createAdHocSession } from "@/lib/actions/session";
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

type Option = { id: string; name: string };

const EMPTY = {
  teacherId: "",
  studentId: "",
  classType: "PRIVATE" as ClassType,
  dateISO: "",
  startTime: "",
  durationMinutes: "60",
};

/**
 * Create a single session directly (ad-hoc), without first making a weekly
 * Schedule and generating from it.
 *
 * Pricing UI is hidden (tarif/payroll feature hidden from the UI, see
 * `.superpowers/sdd/hide-tarif.md`) — every ad-hoc session is submitted with
 * `packagePrice: 0, packageSessions: 1`, so `rate` resolves to 0. The
 * underlying package-price fields/logic are untouched server-side.
 */
export function AddSessionDialog({
  teachers,
  students,
}: {
  teachers: Option[];
  students: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, setIsPending] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    const result = await createAdHocSession({
      teacherId: form.teacherId,
      studentId: form.studentId,
      classType: form.classType,
      packagePrice: 0,
      packageSessions: 1,
      dateISO: form.dateISO,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
    });
    setIsPending(false);
    if (result.ok) {
      toast.success("Sesi berhasil dibuat");
      setForm(EMPTY);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          Tambah Sesi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Sesi</DialogTitle>
          <DialogDescription>
            Buat satu sesi langsung untuk tanggal tertentu, tanpa perlu jadwal
            mingguan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Guru</Label>
            <Select value={form.teacherId} onValueChange={(v) => set("teacherId", v)}>
              <SelectTrigger>
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
          </div>

          <div className="grid gap-2">
            <Label>Murid</Label>
            <Select value={form.studentId} onValueChange={(v) => set("studentId", v)}>
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
              <Label htmlFor="s-date">Tanggal</Label>
              <Input
                id="s-date"
                type="date"
                value={form.dateISO}
                onChange={(e) => set("dateISO", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-time">Jam Mulai</Label>
              <Input
                id="s-time"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="s-duration">Durasi (menit)</Label>
            <Input
              id="s-duration"
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
