import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Tag, X, LayoutTemplate, ChevronDown, Download, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

// ─── Wiki-link preprocessing ──────────────────────────────────────────────────

function preprocessWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, title) =>
    `[${title}](wikilink:${encodeURIComponent(title)})`
  );
}

// ─── Markdown components ──────────────────────────────────────────────────────

function makeMarkdownComponents(onWikiClick: (title: string) => void) {
  return {
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className="text-xl font-bold mb-3 mt-0 text-foreground">{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className="text-base font-semibold mb-2 mt-5 text-foreground">{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="text-sm font-semibold mb-1.5 mt-3 text-foreground">{children}</h3>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-3 text-foreground/90 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-3 space-y-1 text-foreground/90">{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground/90">{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="text-foreground/90">{children}</li>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground mb-3">
        {children}
      </blockquote>
    ),
    code: ({ children, className }: { children: React.ReactNode; className?: string }) =>
      className ? (
        <code className="block bg-muted rounded-lg p-3 text-xs font-mono overflow-auto mb-3 whitespace-pre">
          {children}
        </code>
      ) : (
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
          {children}
        </code>
      ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    a: ({ children, href }: { children: React.ReactNode; href?: string }) => {
      if (href?.startsWith("wikilink:")) {
        const title = decodeURIComponent(href.slice(9));
        return (
          <span
            className="text-primary border-b border-primary/40 cursor-pointer hover:text-primary/70 transition-colors font-medium"
            onClick={(e) => { e.stopPropagation(); onWikiClick(title); }}
          >
            [[{title}]]
          </span>
        );
      }
      return (
        <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    hr: () => <hr className="border-border my-4" />,
    input: ({ type, checked }: { type?: string; checked?: boolean }) =>
      type === "checkbox" ? (
        <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-primary" />
      ) : null,
  } as Parameters<typeof ReactMarkdown>[0]["components"];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NoteEditor({ note, onUpdate, onAddConnection }: NoteEditorProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [tagInput, setTagInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  // Preview vs edit — start in edit mode if note is empty
  const [editing, setEditing] = useState(!note.content);

  // Wiki-link autocomplete
  const [wikiQuery, setWikiQuery] = useState<string | null>(null);
  const [wikiResults, setWikiResults] = useState<ApiNote[]>([]);
  const [wikiSearching, setWikiSearching] = useState(false);
  const wikiCursorRef = useRef<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Wiki-link search
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

  function enterEditMode() {
    setEditing(true);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    });
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    onUpdate({ title: e.target.value });
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    wikiCursorRef.current = cursor;
    const before = val.slice(0, cursor);
    const wikiMatch = before.match(/\[\[([^\][\n]*)$/);
    setWikiQuery(wikiMatch ? wikiMatch[1] : null);
    setContent(val);
    onUpdate({ content: val });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (wikiQuery !== null) {
      if (e.key === "Escape") {
        e.preventDefault();
        setWikiQuery(null);
        return;
      }
      if (e.key === "Enter" && wikiResults.length > 0) {
        e.preventDefault();
        selectWikiNote(wikiResults[0]);
        return;
      }
    }
    if (e.key === "Escape" && !wikiQuery) {
      e.preventDefault();
      setWikiQuery(null);
      setWikiResults([]);
      setEditing(false);
    }
  }

  function handleBlur() {
    setWikiQuery(null);
    setWikiResults([]);
    setEditing(false);
  }

  const selectWikiNote = useCallback((selected: ApiNote) => {
    const cursor = wikiCursorRef.current;
    const before = content.slice(0, cursor);
    const after = content.slice(cursor);
    const wikiStart = before.lastIndexOf("[[");
    if (wikiStart === -1) return;

    const inserted = `[[${selected.title}]]`;
    const newContent = `${before.slice(0, wikiStart)}${inserted}${after}`;
    setContent(newContent);
    onUpdate({ content: newContent });
    setWikiQuery(null);
    setWikiResults([]);
    if (onAddConnection) onAddConnection(selected.id).catch(() => {});

    const newPos = wikiStart + inserted.length;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newPos, newPos);
    });
  }, [content, onUpdate, onAddConnection]);

  function applyTemplate(templateContent: string) {
    setContent(templateContent);
    onUpdate({ content: templateContent });
    setShowTemplates(false);
    enterEditMode();
  }

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

  function exportMarkdown() {
    const slug = title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function navigateToWikiTitle(wikiTitle: string) {
    try {
      const { data } = await api.notes.list({ q: wikiTitle, limit: 5 });
      const match = data.find((n) => n.title.toLowerCase() === wikiTitle.toLowerCase());
      if (match) navigate({ to: "/notes/$id", params: { id: match.id } });
    } catch {}
  }

  const mdComponents = makeMarkdownComponents(navigateToWikiTitle);

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
          <span>{content.length} chars</span>
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

      {/* Content — single pane: preview or edit */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={"Write here…\n\nFull Markdown support: **bold**, *italic*, ## headings, - lists, ```code```\n\nUse [[Note Name]] to connect notes."}
          className="min-h-[480px] w-full resize-none rounded-xl border border-border bg-card p-5 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
          onClick={() => setShowTemplates(false)}
        />
      ) : (
        <div
          className="min-h-[480px] rounded-xl border border-border bg-card p-5 text-sm leading-relaxed cursor-text group relative"
          onClick={enterEditMode}
        >
          {/* Edit hint on hover */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-md bg-muted/80 px-2 py-1 text-[10px] text-muted-foreground">
            <Pencil className="size-3" />
            Click to edit
          </div>

          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {preprocessWikiLinks(content)}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground/30 italic text-sm">
              Click to start writing…
            </p>
          )}
        </div>
      )}

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
