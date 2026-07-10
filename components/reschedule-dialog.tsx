"use client";

import { useState } from "react";
import { toast } from "sonner";

import { rescheduleSession } from "@/lib/actions/session";
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

export type RescheduleDialogProps = {
  sessionId: string;
  /** Original date/time, "YYYY-MM-DD" / "HH:mm" — used to prefill the form. */
  currentDate: string;
  currentStartTime: string;
  disabled?: boolean;
};

/**
 * Dialog for moving a session to a new date/time. On submit, calls
 * `rescheduleSession`, which (server-side) marks the original session
 * RESCHEDULE and creates a new SCHEDULED session for the chosen slot after
 * checking it doesn't conflict with another session on that date.
 */
export function RescheduleDialog({
  sessionId,
  currentDate,
  currentStartTime,
  disabled,
}: RescheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDate);
  const [startTime, setStartTime] = useState(currentStartTime);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDate(currentDate);
      setStartTime(currentStartTime);
    }
    setOpen(next);
  }

  async function handleSubmit() {
    if (!date || !startTime) {
      toast.error("Tanggal dan jam wajib diisi");
      return;
    }

    setIsPending(true);
    const result = await rescheduleSession(sessionId, date, startTime);
    setIsPending(false);

    if (result.ok) {
      toast.success("Sesi berhasil direschedule");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
      >
        Reschedule
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule sesi</DialogTitle>
            <DialogDescription>
              Sesi ini akan ditandai Reschedule dan sesi baru berstatus
              Terjadwal akan dibuat pada tanggal/jam pengganti.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="reschedule-date">Tanggal baru</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reschedule-time">Jam baru</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Memproses..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
