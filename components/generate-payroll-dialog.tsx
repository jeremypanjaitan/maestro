"use client";

import { useState } from "react";
import { toast } from "sonner";

import { generatePayroll } from "@/lib/actions/payroll";
import { MONTH_NAMES_ID, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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

export type GeneratePayrollTeacherOption = { id: string; name: string };

type GeneratePayrollDialogProps = {
  teachers: GeneratePayrollTeacherOption[];
};

function defaultPeriod() {
  const now = new Date();
  return { month: String(now.getMonth() + 1), year: String(now.getFullYear()) };
}

export function GeneratePayrollDialog({ teachers }: GeneratePayrollDialogProps) {
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [period, setPeriod] = useState(defaultPeriod);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setTeacherId("");
      setPeriod(defaultPeriod());
    }
    setOpen(next);
  }

  async function handleGenerate() {
    if (!teacherId) {
      toast.error("Pilih guru terlebih dahulu");
      return;
    }

    setIsPending(true);
    const result = await generatePayroll(teacherId, Number(period.month), Number(period.year));
    setIsPending(false);

    if (result.ok) {
      toast.success(
        `Payroll dibuat: ${result.itemCount} sesi, total ${formatRupiah(result.total)}`,
      );
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Button onClick={() => handleOpenChange(true)}>Generate Payroll</Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Payroll</DialogTitle>
            <DialogDescription>
              Menghitung total gaji guru dari sesi HADIR pada periode yang
              dipilih. Men-generate ulang periode yang sudah ada akan
              mengganti rinciannya dan mengembalikan status ke Draft (kecuali
              sudah PAID).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Guru</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Bulan</Label>
                <Select
                  value={period.month}
                  onValueChange={(value) => setPeriod((prev) => ({ ...prev, month: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES_ID.map((label, index) => (
                      <SelectItem key={label} value={String(index + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year">Tahun</Label>
                <Input
                  id="year"
                  type="number"
                  value={period.year}
                  onChange={(e) => setPeriod((prev) => ({ ...prev, year: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Memproses..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
