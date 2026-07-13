"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PhotoViewerProps = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Thumbnail `<img>` that opens a full-size lightbox (shadcn `Dialog`) on
 * click. Used everywhere a PHOTO attachment is rendered as a small
 * thumbnail so users can see the full-resolution image without leaving
 * the page. Self-contained -- no external lightbox library.
 */
export function PhotoViewer({ src, alt, className }: PhotoViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-zoom-in"
        aria-label={`Lihat foto penuh: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not a static asset next/image can optimize */}
        <img src={src} alt={alt} className={cn(className, "cursor-zoom-in")} />
      </button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{alt}</DialogTitle>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not a static asset next/image can optimize */}
        <img src={src} alt={alt} className="max-h-[80vh] w-full object-contain rounded" />
      </DialogContent>
    </Dialog>
  );
}
