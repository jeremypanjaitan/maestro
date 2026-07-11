"use client";

import { useState } from "react";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";

import {
  generatePayroll,
  getPayableSessions,
  type PayableSession,
} from "@/lib/actions/payroll";
import { MONTH_NAMES_ID, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/status-badge";
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

export type GeneratePayrollTeacherOption = { id: string; name: string };

type GeneratePayrollDialogProps = {
  teachers: GeneratePayrollTeacherOption[];
};

function defaultPeriod() {
  const now = new Date();
  return { month: String(now.getMonth() + 1), year: String(now.getFullYear()) };
}

const PAY_STATUS_LABEL: Record<PayableSession["payStatus"], string> = {
  UNPAID: "Belum dibayar",
  PROCESSING: "Diproses",
  PAID: "Sudah dibayar",
};

const PAY_STATUS_TONE: Record<PayableSession["payStatus"], "amber" | "blue" | "green"> = {
  UNPAID: "amber",
  PROCESSING: "blue",
  PAID: "green",
};

export function GeneratePayrollDialog({ teachers }: GeneratePayrollDialogProps) {
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [period, setPeriod] = useState(defaultPeriod);
  const [isPending, setIsPending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessions, setSessions] = useState<PayableSession[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function handleOpenChange(next: boolean) {
    if (next) {
      setTeacherId("");
      setPeriod(defaultPeriod());
      setSessions(null);
      setSelectedIds(new Set());
    }
    setOpen(next);
  }

  async function loadSessions(nextTeacherId: string, month: string, year: string) {
    if (!nextTeacherId) {
      setSessions(null);
      setSelectedIds(new Set());
      return;
    }

    setIsLoadingSessions(true);
    const result = await getPayableSessions(nextTeacherId, Number(month), Number(year));
    setIsLoadingSessions(false);

    if (!result.ok) {
      toast.error(result.error);
      setSessions(null);
      setSelectedIds(new Set());
      return;
    }

    setSessions(result.sessions);
    // Default selection: everything already checked (unpaid rows default
    // checked; rows already part of this period's draft/approved payroll
    // are pre-checked; paid rows are shown but their checkbox is disabled
    // and never selected).
    setSelectedIds(
      new Set(
        result.sessions
          .filter((s) => s.payStatus !== "PAID" && (s.payStatus === "UNPAID" || s.inThisPayroll))
          .map((s) => s.id),
      ),
    );
  }

  function handleTeacherChange(value: string) {
    setTeacherId(value);
    void loadSessions(value, period.month, period.year);
  }

  function handlePeriodChange(next: { month: string; year: string }) {
    setPeriod(next);
    void loadSessions(teacherId, next.month, next.year);
  }

  function toggleSession(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  const selectedTotal = (sessions ?? [])
    .filter((s) => selectedIds.has(s.id))
    .reduce((sum, s) => sum + s.rate, 0);
  const selectedCount = selectedIds.size;

  async function handleGenerate() {
    if (!teacherId) {
      toast.error("Pilih guru terlebih dahulu");
      return;
    }

    setIsPending(true);
    const result = await generatePayroll(
      teacherId,
      Number(period.month),
      Number(period.year),
      Array.from(selectedIds),
    );
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
      <Button onClick={() => handleOpenChange(true)}>
        <WalletCards />
        Generate Payroll
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Payroll</DialogTitle>
            <DialogDescription>
              Pilih pertemuan (sesi HADIR) yang ingin dibayarkan pada periode
              ini. Men-generate ulang periode yang sudah ada akan mengganti
              rinciannya dan mengembalikan status ke Draft (kecuali sudah
              PAID). Sesi yang sudah dibayar tidak bisa dipilih ulang.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Guru</Label>
              <Select value={teacherId} onValueChange={handleTeacherChange}>
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
                  onValueChange={(value) => handlePeriodChange({ ...period, month: value })}
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
                  onChange={(e) => handlePeriodChange({ ...period, year: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Pertemuan</Label>
                {sessions ? (
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} dipilih · {formatRupiah(selectedTotal)}
                  </span>
                ) : null}
              </div>

              <div className="max-h-80 overflow-y-auto rounded-md border">
                {!teacherId ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Pilih guru untuk memuat daftar pertemuan.
                  </p>
                ) : isLoadingSessions ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Memuat...</p>
                ) : !sessions || sessions.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Tidak ada sesi HADIR pada periode ini.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {sessions.map((session) => {
                      const disabled = session.payStatus === "PAID";
                      return (
                        <li
                          key={session.id}
                          className="flex items-center gap-3 px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedIds.has(session.id)}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              toggleSession(session.id, checked === true)
                            }
                          />
                          <div className="flex flex-1 flex-col">
                            <span className="font-medium">
                              {session.studentName}
                              {session.meetingNumber != null
                                ? ` · Pertemuan ke-${session.meetingNumber}`
                                : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {session.dateStr} · {session.startTime}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatRupiah(session.rate)}
                          </span>
                          <StatusBadge
                            label={PAY_STATUS_LABEL[session.payStatus]}
                            tone={PAY_STATUS_TONE[session.payStatus]}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Memproses..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
