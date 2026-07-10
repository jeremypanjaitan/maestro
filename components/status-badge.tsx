import type { PayrollStatus, SessionStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  PAYROLL_STATUS_LABELS,
  SESSION_STATUS_LABELS,
} from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "gray"
  | "outline"
  | "secondary";

const TONE_CLASSES: Partial<Record<StatusTone, string>> = {
  green:
    "border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  amber:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  red: "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  blue: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  gray: "border-transparent bg-muted text-muted-foreground line-through",
};

const TONE_VARIANT: Record<StatusTone, "outline" | "secondary"> = {
  green: "secondary",
  amber: "secondary",
  red: "secondary",
  blue: "secondary",
  gray: "secondary",
  outline: "outline",
  secondary: "secondary",
};

/** Generic status pill: pass a label and a semantic tone. */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <Badge variant={TONE_VARIANT[tone]} className={cn(TONE_CLASSES[tone], className)}>
      {label}
    </Badge>
  );
}

const SESSION_STATUS_TONE: Record<SessionStatus, StatusTone> = {
  SCHEDULED: "outline",
  HADIR: "green",
  MURID_TIDAK_HADIR: "amber",
  GURU_TIDAK_HADIR: "red",
  RESCHEDULE: "blue",
  CANCEL: "gray",
};

export function SessionStatusBadge({
  status,
  className,
}: {
  status: SessionStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      label={SESSION_STATUS_LABELS[status]}
      tone={SESSION_STATUS_TONE[status]}
      className={className}
    />
  );
}

const PAYROLL_STATUS_TONE: Record<PayrollStatus, StatusTone> = {
  DRAFT: "secondary",
  APPROVED: "blue",
  PAID: "green",
};

export function PayrollStatusBadge({
  status,
  className,
}: {
  status: PayrollStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      label={PAYROLL_STATUS_LABELS[status]}
      tone={PAYROLL_STATUS_TONE[status]}
      className={className}
    />
  );
}
