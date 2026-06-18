import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Tag, X, LayoutTemplate, ChevronDown, Download, CheckSquare } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Input } from "@my-better-t-app/ui/components/input";
import { Button } from "@my-better-t-app/ui/components/button";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { TagBadge } from "@/components/notes/tag-badge";
import { api, type ApiNote } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  note: ApiNote;
  onUpdate: (fields: { title?: string; content?: string; tags?: string[] }) => void;
  onAddConnection?: (toNoteId: string) => Promise<void>;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "fleeting",   label: "Fleeting Note",  content: "" },
  { id: "literature", label: "Literature Note", content: "## Summary\n\n\n## Key Quote\n\n\n## My Take\n\n" },
  { id: "permanent",  label: "Permanent Note",  content: "## Main Idea\n\n\n## Evidence / Reasoning\n\n\n## Connections\n\n" },
  { id: "project",    label: "Project",         content: "## Goal\n\n\n## Why It Matters\n\n\n## Next Steps\n- [ ] \n\n## References\n\n" },
  { id: "area",       label: "Area",            content: "## Description\n\n\n## Standards & Responsibilities\n\n\n## References\n\n" },
  { id: "resource",   label: "Resource",        content: "## About\n\n\n## Key Points\n\n\n## Practical Application\n\n" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function NoteEditor({ note, onUpdate, onAddConnection }: NoteEditorProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(note.title);
  const [tagInput, setTagInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  // Wiki-link autocomplete
  const [wikiQuery, setWikiQuery] = useState<string | null>(null);
  const [wikiResults, setWikiResults] = useState<ApiNote[]>([]);
  const [wikiSearching, setWikiSearching] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef(note.content ?? "");

  // ─── TipTap editor setup ─────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable history shortcut conflicts — handled by StarterKit defaults
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Write here…\n\nUse **bold**, *italic*, ## heading, - list, - [ ] todo\nType [[ to link notes.",
        emptyEditorClass: "is-editor-empty",
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: note.content ?? "",
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = (editor.storage as any).markdown.getMarkdown() as string;
      contentRef.current = markdown;
      onUpdate({ content: markdown });

      // Wiki-link detection
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 200),
        from,
        "\n",
      );
      const match = textBefore.match(/\[\[([^\][\n|]*)$/);
      setWikiQuery(match ? match[1] : null);
    },
    editorProps: {
      attributes: {
        class: "tiptap-brain-editor",
      },
    },
  });

  // Update editor when note changes (navigating between notes)
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markdown = (editor.storage as any).markdown.getMarkdown() as string;
    if (markdown !== (note.content ?? "")) {
      editor.commands.setContent(note.content ?? "");
      contentRef.current = note.content ?? "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // ─── Wiki-link search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (wikiQuery === null) { setWikiResults([]); return; }
    const delay = wikiQuery.length > 0 ? 180 : 0;
    const timer = setTimeout(async () => {
      setWikiSearching(true);
      try {
        const params = wikiQuery.length > 0 ? { q: wikiQuery, limit: 7 } : { limit: 7 };
        const { data } = await api.notes.list(params);
        setWikiResults(data.filter((n) => n.id !== note.id));
      } finally {
        setWikiSearching(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [wikiQuery, note.id]);

  const selectWikiNote = useCallback((selected: ApiNote) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 200), from, "\n");
    const match = textBefore.match(/\[\[([^\][\n|]*)$/);
    if (!match) return;

    editor.chain()
      .focus()
      .deleteRange({ from: from - match[0].length, to: from })
      .insertContent(`[[${selected.title}]] `)
      .run();

    setWikiQuery(null);
    setWikiResults([]);
    if (onAddConnection) onAddConnection(selected.id).catch(() => {});
  }, [editor, onAddConnection]);

  // ─── Keyboard handling in wiki autocomplete ───────────────────────────────────

  useEffect(() => {
    if (!editor || wikiQuery === null) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setWikiQuery(null); setWikiResults([]); }
      if (e.key === "Enter" && wikiResults.length > 0) {
        e.preventDefault();
        selectWikiNote(wikiResults[0]);
      }
    };

    const el = editor.view.dom;
    el.addEventListener("keydown", handler, { capture: true });
    return () => el.removeEventListener("keydown", handler, { capture: true });
  }, [editor, wikiQuery, wikiResults, selectWikiNote]);

  // ─── Toolbar actions ──────────────────────────────────────────────────────────

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    onUpdate({ title: e.target.value });
  }

  function applyTemplate(templateContent: string) {
    editor?.commands.setContent(templateContent);
    onUpdate({ content: templateContent });
    setShowTemplates(false);
    editor?.commands.focus();
  }

  function insertTodo() {
    if (!editor) return;
    editor.chain().focus().toggleTaskList().run();
  }

  function exportMarkdown() {
    const slug = title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const content = contentRef.current;
    const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Tags ────────────────────────────────────────────────────────────────────

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || note.tags.includes(tag)) return;
    onUpdate({ tags: [...note.tags, tag] });
    setTagInput("");
  }

  function removeTag(tag: string) {
    onUpdate({ tags: note.tags.filter((t) => t !== tag) });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && note.tags.length > 0) {
      removeTag(note.tags[note.tags.length - 1]);
    }
  }

  const wordCount = editor?.getText()?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const charCount = contentRef.current.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <input
        className="w-full bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/40 outline-none border-none"
        value={title}
        onChange={handleTitleChange}
        placeholder="Note title…"
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between -mb-2">
        <div className="flex items-center gap-1">
          {/* Templates */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowTemplates((v) => !v)}
            >
              <LayoutTemplate className="size-3" />
              Templates
              <ChevronDown className="size-3" />
            </Button>
            {showTemplates && (
              <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.content)}
                    className="flex w-full items-center px-3 py-2 text-xs text-left hover:bg-accent transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Insert Todo */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={insertTodo}
            title="Insert checkbox / task list"
          >
            <CheckSquare className="size-3" />
            Todo
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={exportMarkdown}
          >
            <Download className="size-3" />
            Export .md
          </Button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground select-none">
          <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
          <span className="opacity-40">·</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Wiki-link autocomplete */}
      {wikiQuery !== null && (
        <div className="rounded-xl border border-primary/30 bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-muted/30">
            <span className="text-[11px] font-semibold text-primary">Connect via [[wikilink]]</span>
            {wikiQuery && (
              <span className="text-[10px] text-muted-foreground">searching &ldquo;{wikiQuery}&rdquo;</span>
            )}
            {wikiSearching && (
              <div className="ml-auto size-3 rounded-full border border-primary border-t-transparent animate-spin" />
            )}
            <button
              className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              onMouseDown={(e) => { e.preventDefault(); setWikiQuery(null); }}
            >
              Esc to close
            </button>
          </div>
          {wikiResults.length === 0 && !wikiSearching ? (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">
              {wikiQuery ? "No notes found." : "Type to search notes…"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 p-2.5">
              {wikiResults.map((n, idx) => (
                <button
                  key={n.id}
                  onMouseDown={(e) => { e.preventDefault(); selectWikiNote(n); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent",
                    idx === 0 && wikiQuery ? "border-primary/40 bg-primary/5" : "border-border",
                  )}
                >
                  <span className={cn("size-2 rounded-full shrink-0", {
                    "bg-note-permanent": n.type === "permanent",
                    "bg-note-literature": n.type === "literature",
                    "bg-note-fleeting": n.type === "fleeting",
                  })} />
                  <span className="font-medium text-foreground">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground">{n.type}</span>
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-border px-3 py-1.5">
            <p className="text-[10px] text-muted-foreground">Enter to select the first result · Esc to close</p>
          </div>
        </div>
      )}

      {/* TipTap Editor — live WYSIWYG markdown */}
      <div
        className="rounded-xl border border-border overflow-hidden focus-within:border-primary/50 transition-colors"
        onClick={() => setShowTemplates(false)}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Tag className="size-3" />
          Tags
        </label>
        <div
          className="flex flex-wrap gap-1.5 min-h-9 rounded-lg border border-border bg-card px-2.5 py-1.5 cursor-text"
          onClick={() => tagInputRef.current?.focus()}
        >
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-[11px] text-accent-foreground font-medium"
            >
              <TagBadge tag={tag} />
              <button
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
          <Input
            ref={tagInputRef}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => { if (tagInput) addTag(tagInput); }}
            placeholder={note.tags.length === 0 ? "Add tag…" : ""}
            className="border-none bg-transparent shadow-none h-6 px-0 text-[11px] min-w-24 flex-1 focus-visible:ring-0"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Press Enter or comma to add · Backspace to remove.
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function NoteEditorSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-3/4 rounded-lg" />
      <Skeleton className="h-[480px] w-full rounded-xl" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
