import { FileText } from "lucide-react";

import { buildDataUrl, normalizeMimeType } from "@/lib/files";
import { PhotoViewer } from "@/components/photo-viewer";

export type ProofView = {
  id: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
};

/**
 * Renders honor-payment proof files: images inline (click to zoom via
 * `PhotoViewer`), PDFs as a labelled link that opens the file in a new tab.
 * Read-only — used by both the admin detail page and the guru view.
 */
export function ProofGallery({ proofs }: { proofs: ProofView[] }) {
  if (proofs.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada bukti.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {proofs.map((proof) => {
        const url = buildDataUrl(proof.mimeType, proof.dataBase64);
        const isPdf = normalizeMimeType(proof.mimeType) === "application/pdf";
        return (
          <div key={proof.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <span className="truncate text-xs text-muted-foreground">
              {proof.filename}
            </span>
            {isPdf ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-32 flex-col items-center justify-center gap-2 rounded bg-muted text-sm text-muted-foreground hover:text-foreground"
              >
                <FileText className="size-8" />
                Buka PDF
              </a>
            ) : (
              <PhotoViewer
                src={url}
                alt={proof.filename}
                className="max-h-48 w-full rounded object-cover"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
