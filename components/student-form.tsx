"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { StudentStatus } from "@prisma/client";

import { createStudent, updateStudent } from "@/lib/actions/student";
import { INSTRUMENTS, LEVELS } from "@/lib/validations/student";
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
import { Textarea } from "@/components/ui/textarea";

export type StudentRecord = {
  id: string;
  name: string;
  parentName: string | null;
  contact: string | null;
  instrument: string;
  level: string | null;
  learningTarget: string | null;
  status: StudentStatus;
};

type StudentFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Student to edit, or `null`/`undefined` to create a new one. */
  student?: StudentRecord | null;
};

const EMPTY_FORM = {
  name: "",
  parentName: "",
  contact: "",
  instrument: "",
  level: "",
  learningTarget: "",
  status: "ACTIVE" as StudentStatus,
};

export function StudentForm({ open, onOpenChange, student }: StudentFormProps) {
  const isEditing = Boolean(student);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, setIsPending] = useState(false);

  // Reset the form fields whenever the dialog opens (for either create or
  // edit) so stale values from a previous open don't leak in.
  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        name: student.name,
        parentName: student.parentName ?? "",
        contact: student.contact ?? "",
        instrument: student.instrument,
        level: student.level ?? "",
        learningTarget: student.learningTarget ?? "",
        status: student.status,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, student]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const payload = {
      name: form.name,
      parentName: form.parentName,
      contact: form.contact,
      instrument: form.instrument,
      level: form.level,
      learningTarget: form.learningTarget,
      status: form.status,
    };

    const result = isEditing
      ? await updateStudent(student!.id, payload)
      : await createStudent(payload);

    setIsPending(false);

    if (result.ok) {
      toast.success(isEditing ? "Murid berhasil diperbarui" : "Murid berhasil ditambahkan");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Murid" : "Tambah Murid"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui data murid."
              : "Isi data murid baru di bawah ini."}
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

          <div className="grid gap-2">
            <Label htmlFor="parentName">Nama Orang Tua</Label>
            <Input
              id="parentName"
              value={form.parentName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, parentName: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact">Kontak</Label>
            <Input
              id="contact"
              value={form.contact}
              onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
              placeholder="0812xxxxxxx"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instrument">Instrumen</Label>
            <Select
              value={form.instrument}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, instrument: value }))
              }
            >
              <SelectTrigger id="instrument">
                <SelectValue placeholder="Pilih instrumen" />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENTS.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {instrument}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="level">Level</Label>
            <Select
              value={form.level}
              onValueChange={(value) => setForm((prev) => ({ ...prev, level: value }))}
            >
              <SelectTrigger id="level">
                <SelectValue placeholder="Pilih level (opsional)" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="learningTarget">Target Belajar</Label>
            <Textarea
              id="learningTarget"
              value={form.learningTarget}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, learningTarget: e.target.value }))
              }
              placeholder="Contoh: Bisa memainkan 3 lagu dalam 6 bulan"
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, status: value as StudentStatus }))
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
