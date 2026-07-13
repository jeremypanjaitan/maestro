"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ClassType } from "@prisma/client";

import { updateSession } from "@/lib/actions/session";
import type { SessionRecord } from "@/components/sessions-table";
import { CLASS_TYPE_LABELS } from "@/lib/domain/constants";
import { formatDbDate } from "@/lib/domain/dbDate";
import { perSessionRate } from "@/lib/domain/rate";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

type FormState = {
  teacherId: string;
  studentId: string;
  classType: ClassType;
  packagePrice: string;
  packageSessions: string;
  dateISO: string;
  startTime: string;
  durationMinutes: string;
};

const EMPTY: FormState = {
  teacherId: "",
  studentId: "",
  classType: "PRIVATE",
  packagePrice: "",
  packageSessions: "",
  dateISO: "",
  startTime: "",
  durationMinutes: "60",
};

function formFromSession(session: SessionRecord): FormState {
  return {
    teacherId: session.teacher.id,
    studentId: session.student.id,
    classType: session.classType,
    packagePrice: String(session.packagePrice),
    packageSessions: String(session.packageSessions),
    dateISO: formatDbDate(session.date),
    startTime: session.startTime,
    durationMinutes: String(session.durationMinutes),
  };
}

/**
 * Edit an existing session (admin). Controlled dialog: the parent
 * (`SessionsTable`) owns `open`/`session` state, since the edit target
 * varies per row.
 */
export function EditSessionDialog({
  open,
  onOpenChange,
  session,
  teachers,
  students,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRecord | null;
  teachers: Option[];
  students: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (session) {
      setForm(formFromSession(session));
    }
  }, [session]);

  const price = Number(form.packagePrice);
  const sessions = Number(form.packageSessions);
  const perSession =
    price >= 1 && sessions >= 1 ? perSessionRate(price, sessions) : null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setIsPending(true);
    const result = await updateSession(session.id, {
      teacherId: form.teacherId,
      studentId: form.studentId,
      classType: form.classType,
      packagePrice: form.packagePrice,
      packageSessions: form.packageSessions,
      dateISO: form.dateISO,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
    });
    setIsPending(false);
    if (result.ok) {
      toast.success("Sesi diperbarui");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Sesi</DialogTitle>
          <DialogDescription>
            Ubah guru, murid, tipe kelas, paket, tanggal, jam, atau durasi
            sesi ini.
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
              <Label htmlFor="e-price">Harga paket (Rp)</Label>
              <Input
                id="e-price"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.packagePrice}
                onChange={(e) => set("packagePrice", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-sessions">Jumlah sesi per paket</Label>
              <Input
                id="e-sessions"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.packageSessions}
                onChange={(e) => set("packageSessions", e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {perSession !== null
              ? `Per sesi: ${formatRupiah(perSession)}`
              : "Isi harga paket dan jumlah sesi untuk melihat tarif per sesi."}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="e-date">Tanggal</Label>
              <Input
                id="e-date"
                type="date"
                value={form.dateISO}
                onChange={(e) => set("dateISO", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-time">Jam Mulai</Label>
              <Input
                id="e-time"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="e-duration">Durasi (menit)</Label>
            <Input
              id="e-duration"
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
