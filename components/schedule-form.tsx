"use client";

import { useEffect, useState } from "react";
import type { ClassType } from "@prisma/client";
import { toast } from "sonner";

import { createSchedule, updateSchedule } from "@/lib/actions/schedule";
import { DAY_LABELS } from "@/lib/validations/schedule";
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

export type ScheduleTeacherOption = {
  id: string;
  name: string;
  ratePerSession: number;
  defaultGroupRate: number | null;
};
export type ScheduleStudentOption = { id: string; name: string; instrument: string };

export type ScheduleRecord = {
  id: string;
  teacherId: string;
  studentId: string;
  instrument: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  classType: ClassType;
  rate: number;
  active: boolean;
};

type ScheduleFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Schedule to edit, or `null`/`undefined` to create a new one. */
  schedule?: ScheduleRecord | null;
  teachers: ScheduleTeacherOption[];
  students: ScheduleStudentOption[];
};

const EMPTY_FORM = {
  teacherId: "",
  studentId: "",
  instrument: "",
  dayOfWeek: "1",
  startTime: "",
  durationMinutes: "60",
  classType: "PRIVATE" as ClassType,
  rate: "",
};

export function ScheduleForm({
  open,
  onOpenChange,
  schedule,
  teachers,
  students,
}: ScheduleFormProps) {
  const isEditing = Boolean(schedule);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, setIsPending] = useState(false);

  // Reset the form fields whenever the dialog opens (for either create or
  // edit) so stale values from a previous open don't leak in.
  useEffect(() => {
    if (!open) return;
    if (schedule) {
      setForm({
        teacherId: schedule.teacherId,
        studentId: schedule.studentId,
        instrument: schedule.instrument,
        dayOfWeek: String(schedule.dayOfWeek),
        startTime: schedule.startTime,
        durationMinutes: String(schedule.durationMinutes),
        classType: schedule.classType,
        rate: String(schedule.rate),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, schedule]);

  function handleStudentChange(studentId: string) {
    const student = students.find((s) => s.id === studentId);
    setForm((prev) => ({
      ...prev,
      studentId,
      // Default the instrument to the student's own instrument, but still
      // let the admin override it (a student may take more than one).
      instrument: prev.instrument || student?.instrument || "",
    }));
  }

  /** Looks up the teacher's default rate for a class type — `ratePerSession`
   * for PRIVATE, `defaultGroupRate` for GROUP — used to prefill (and
   * re-prefill) the rate field. Returns "" if the teacher or its default is
   * unknown, so the admin has to fill it in manually. */
  function defaultRateFor(teacherId: string, classType: ClassType): string {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return "";
    const rate = classType === "GROUP" ? teacher.defaultGroupRate : teacher.ratePerSession;
    return rate != null ? String(rate) : "";
  }

  function handleTeacherChange(teacherId: string) {
    setForm((prev) => ({
      ...prev,
      teacherId,
      rate: defaultRateFor(teacherId, prev.classType),
    }));
  }

  function handleClassTypeChange(classType: ClassType) {
    setForm((prev) => ({
      ...prev,
      classType,
      rate: defaultRateFor(prev.teacherId, classType),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const payload = {
      teacherId: form.teacherId,
      studentId: form.studentId,
      instrument: form.instrument,
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
      classType: form.classType,
      rate: form.rate,
    };

    const result = isEditing
      ? await updateSchedule(schedule!.id, payload)
      : await createSchedule(payload);

    setIsPending(false);

    if (result.ok) {
      toast.success(isEditing ? "Jadwal berhasil diperbarui" : "Jadwal berhasil ditambahkan");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
          <DialogDescription>
            Jadwal mingguan berulang. Sistem menolak jadwal yang bentrok dengan
            guru atau murid yang sama pada hari dan jam yang sama.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Guru</Label>
            <Select value={form.teacherId} onValueChange={handleTeacherChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih guru" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Murid</Label>
            <Select value={form.studentId} onValueChange={handleStudentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih murid" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instrument">Instrumen</Label>
            <Input
              id="instrument"
              value={form.instrument}
              onChange={(e) => setForm((prev) => ({ ...prev, instrument: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipe Kelas</Label>
              <Select
                value={form.classType}
                onValueChange={(value) => handleClassTypeChange(value as ClassType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">{CLASS_TYPE_LABELS.PRIVATE}</SelectItem>
                  <SelectItem value="GROUP">{CLASS_TYPE_LABELS.GROUP}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate">Tarif per sesi (Rp)</Label>
              <Input
                id="rate"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.rate}
                onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Hari</Label>
            <Select
              value={form.dayOfWeek}
              onValueChange={(value) => setForm((prev) => ({ ...prev, dayOfWeek: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_LABELS.map((label, index) => (
                  <SelectItem key={label} value={String(index)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Jam Mulai</Label>
              <Input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="durationMinutes">Durasi (menit)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                step={15}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
                }
                required
              />
            </div>
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
