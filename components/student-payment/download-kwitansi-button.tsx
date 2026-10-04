import { Eye, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Preview (opens the PDF in a new tab) + download links for a kwitansi. */
export function DownloadKwitansiButton({
  paymentId,
  label = "Kwitansi",
}: {
  paymentId: string;
  label?: string;
}) {
  const href = `/api/export/kwitansi/${paymentId}`;
  return (
    <>
      <Button variant="outline" size="sm" asChild>
        <a href={`${href}?inline=1`} target="_blank" rel="noopener noreferrer">
          <Eye className="size-4" />
          Lihat
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={href} download>
          <FileDown className="size-4" />
          {label}
        </a>
      </Button>
    </>
  );
}
