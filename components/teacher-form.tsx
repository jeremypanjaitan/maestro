"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { TeacherStatus } from "@prisma/client";

import { createTeacher, updateTeacher } from "@/lib/actions/teacher";
import { INSTRUMENTS } from "@/lib/validations/teacher";
import { cn } from "@/lib/utils";
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

export type TeacherRecord = {
  id: string;
  name: string;
  instruments: string[];
  ratePerSession: number;
  phone: string | null;
  status: TeacherStatus;
  user: { email: string } | null;
};

type TeacherFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Teacher to edit, or `null`/`undefined` to create a new one. */
  teacher?: TeacherRecord | null;
};

const EMPTY_FORM = {
  name: "",
  email: "",
  instruments: [] as string[],
  ratePerSession: "",
  phone: "",
  status: "ACTIVE" as TeacherStatus,
};

export function TeacherForm({ open, onOpenChange, teacher }: TeacherFormProps) {
  const isEditing = Boolean(teacher);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, setIsPending] = useState(false);

  // Reset the form fields whenever the dialog opens (for either create or
  // edit) so stale values from a previous open don't leak in.
  useEffect(() => {
    if (!open) return;
    if (teacher) {
      setForm({
        name: teacher.name,
        email: teacher.user?.email ?? "",
        instruments: teacher.instruments,
        ratePerSession: String(teacher.ratePerSession),
        phone: teacher.phone ?? "",
        status: teacher.status,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, teacher]);

  function toggleInstrument(instrument: string) {
    setForm((prev) => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter((value) => value !== instrument)
        : [...prev.instruments, instrument],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const payload = {
      name: form.name,
      instruments: form.instruments,
      ratePerSession: form.ratePerSession,
      phone: form.phone,
      status: form.status,
    };

    const result = isEditing
      ? await updateTeacher(teacher!.id, payload)
      : await createTeacher({ ...payload, email: form.email });

    setIsPending(false);

    if (result.ok) {
      toast.success(isEditing ? "Guru berhasil diperbarui" : "Guru berhasil ditambahkan");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Guru" : "Tambah Guru"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui data dan tarif guru."
              : "Guru baru akan otomatis mendapat akun login (role Guru)."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {isEditing ? (
            <div className="grid gap-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{form.email}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                placeholder="nama@contoh.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Password awal: <span className="font-mono">guru123</span>
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Instrumen</Label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((instrument) => {
                const active = form.instruments.includes(instrument);
                return (
                  <button
                    key={instrument}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleInstrument(instrument)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {instrument}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ratePerSession">Tarif per sesi (Rp)</Label>
            <Input
              id="ratePerSession"
              type="number"
              min={1}
              step={1000}
              value={form.ratePerSession}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, ratePerSession: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">No. Telepon</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="0812xxxxxxx"
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, status: value as TeacherStatus }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
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
