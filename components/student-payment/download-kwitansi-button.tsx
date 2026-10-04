import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Plain link to the kwitansi PDF route — the browser handles the download. */
export function DownloadKwitansiButton({
  paymentId,
  label = "Kwitansi",
}: {
  paymentId: string;
  label?: string;
}) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={`/api/export/kwitansi/${paymentId}`} download>
        <FileDown className="size-4" />
        {label}
      </a>
    </Button>
  );
}
