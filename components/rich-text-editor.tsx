"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Heading2, List, ListOrdered } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

/**
 * Controlled WYSIWYG editor (TipTap/ProseMirror) for the lesson report's
 * Materi/Catatan fields. Content is emitted as sanitized-on-render HTML
 * (see `components/rich-text.tsx`) and stored in the existing
 * `LessonReport.material`/`.notes` string columns -- no schema change.
 *
 * `immediatelyRender: false` is required under Next's App Router: TipTap
 * otherwise renders content during SSR and throws a hydration mismatch.
 */
export function RichTextEditor({ value, onChange, placeholder, ariaLabel }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose-editor focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-1 [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes into the editor (e.g. a parent resetting
  // the form after save) without wiping the user's in-progress edits on
  // every keystroke -- only push `setContent` when the incoming value
  // actually differs from what the editor currently holds.
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="rounded-md border border-input bg-transparent px-3 py-2 min-h-28 text-sm text-muted-foreground">
        {placeholder}
      </div>
    );
  }

  const toolbarButtons = [
    {
      label: "Bold",
      icon: Bold,
      isActive: () => editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      isActive: () => editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Heading",
      icon: Heading2,
      isActive: () => editor.isActive("heading", { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Bullet List",
      icon: List,
      isActive: () => editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered List",
      icon: ListOrdered,
      isActive: () => editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {toolbarButtons.map(({ label, icon: Icon, isActive, onClick }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={isActive()}
            className={cn(isActive() && "bg-muted text-foreground")}
            onClick={onClick}
          >
            <Icon />
          </Button>
        ))}
      </div>
      <div className="rounded-md border border-input bg-transparent px-3 py-2 min-h-28 text-sm focus-within:ring-1 focus-within:ring-ring">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
