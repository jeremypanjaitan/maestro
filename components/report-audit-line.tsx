const ROLE_LABELS = { ADMIN: "Admin", GURU: "Guru" } as const;

type ReportAuditLineProps = {
  updatedAt: Date;
  updatedByName: string | null;
  updatedByRole: keyof typeof ROLE_LABELS | null;
};

/**
 * "Terakhir diubah oleh ..." footer for a lesson report.
 *
 * Renders nothing when there's no recorded author — reports written before
 * the audit trail existed have `updatedByUserId = null`, and showing a bare
 * timestamp with no name would imply we know who edited it when we don't.
 *
 * The role matters more than the name here: since an ADMIN can now edit a
 * report a GURU filled in, this line is the only thing distinguishing the
 * two after the fact.
 */
export function ReportAuditLine({
  updatedAt,
  updatedByName,
  updatedByRole,
}: ReportAuditLineProps) {
  if (!updatedByName || !updatedByRole) {
    return null;
  }

  const stamp = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(updatedAt);

  return (
    <p className="text-xs text-muted-foreground">
      Terakhir diubah oleh {updatedByName} ({ROLE_LABELS[updatedByRole]}) · {stamp}
    </p>
  );
}
