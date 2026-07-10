"use client";

import { useState } from "react";
import type { SessionStatus } from "@prisma/client";
import { toast } from "sonner";

import { cancelSession, updateSessionStatus } from "@/lib/actions/session";
import { SESSION_STATUS_LABELS } from "@/lib/domain/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Statuses settable from this dropdown. RESCHEDULE is excluded on purpose:
 * that transition creates/links a replacement session and only happens
 * through `rescheduleSession` (see `RescheduleDialog`). */
const ASSIGNABLE_STATUSES: SessionStatus[] = [
  "SCHEDULED",
  "HADIR",
  "MURID_TIDAK_HADIR",
  "GURU_TIDAK_HADIR",
];

const STATUS_BADGE_VARIANT: Record<SessionStatus, "default" | "outline" | "secondary" | "destructive"> = {
  SCHEDULED: "outline",
  HADIR: "default",
  MURID_TIDAK_HADIR: "secondary",
  GURU_TIDAK_HADIR: "secondary",
  RESCHEDULE: "secondary",
  CANCEL: "destructive",
};

export type AttendanceControlsProps = {
  sessionId: string;
  status: SessionStatus;
};

/**
 * Per-row attendance controls for the guru "Sesi & Absensi" screen (and
 * reusable anywhere else a session's status needs to be set): a status
 * dropdown that calls `updateSessionStatus`, plus a "Batalkan" alert-dialog
 * that calls `cancelSession`. Ownership (guru may only touch their own
 * sessions) is enforced server-side inside those actions — this component
 * has no client-side role logic and trusts nothing about the caller.
 */
export function AttendanceControls({ sessionId, status }: AttendanceControlsProps) {
  const [isPending, setIsPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // RESCHEDULE/CANCEL are terminal for this control: once a session has been
  // replaced or cancelled, flipping its status directly would corrupt the
  // reschedule link / cancellation record.
  const locked = status === "RESCHEDULE" || status === "CANCEL";

  async function handleStatusChange(next: string) {
    if (next === status) return;
    setIsPending(true);
    const result = await updateSessionStatus(sessionId, next);
    setIsPending(false);

    if (result.ok) {
      toast.success(`Status diubah ke ${SESSION_STATUS_LABELS[next as SessionStatus]}`);
    } else {
      toast.error(result.error);
    }
  }

  async function confirmCancel() {
    setIsPending(true);
    const result = await cancelSession(sessionId);
    setIsPending(false);

    if (result.ok) {
      toast.success("Sesi dibatalkan");
      setCancelOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  if (locked) {
    return <Badge variant={STATUS_BADGE_VARIANT[status]}>{SESSION_STATUS_LABELS[status]}</Badge>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNABLE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {SESSION_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            Batalkan
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan sesi?</AlertDialogTitle>
            <AlertDialogDescription>
              Status sesi ini akan diubah menjadi CANCEL. Tindakan ini tidak
              membuat sesi pengganti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} disabled={isPending}>
              {isPending ? "Memproses..." : "Ya, batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
