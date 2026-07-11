import sanitize from "sanitize-html";

import { cn } from "@/lib/utils";

/**
 * Allowlist used to sanitize lesson-report HTML (Materi/Catatan) before it's
 * ever dropped into `dangerouslySetInnerHTML`. Only the tags the WYSIWYG
 * toolbar (`components/rich-text-editor.tsx`) can produce are permitted --
 * everything else (scripts, styles, `on*` handlers, iframes, ...) is
 * stripped rather than escaped.
 */
export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "a",
    ],
    allowedAttributes: {
      a: ["href"],
    },
    // Force safe link behavior regardless of what the stored HTML says.
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}

const RICH_TEXT_CLASS =
  "text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-1 [&_a]:underline";

type RichTextProps = {
  html: string;
  className?: string;
};

/**
 * Renders sanitized lesson-report HTML (Materi/Catatan). Server-safe (no
 * hooks, no "use client") so it can be used directly from server components
 * like `app/admin/sessions/[id]/report/page.tsx`.
 *
 * Legacy rows saved before the WYSIWYG editor existed contain plain text,
 * not HTML -- those are detected (`!/</.test(html)`) and rendered as a plain
 * (React-escaped) text node with `whitespace-pre-wrap` so line breaks still
 * read correctly, instead of being sanitized as a single paragraph-less
 * blob.
 */
export function RichText({ html, className }: RichTextProps) {
  const isPlainText = !/</.test(html);

  if (isPlainText) {
    return (
      <div className={cn(RICH_TEXT_CLASS, "whitespace-pre-wrap", className)}>
        {html}
      </div>
    );
  }

  return (
    <div
      className={cn(RICH_TEXT_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}

