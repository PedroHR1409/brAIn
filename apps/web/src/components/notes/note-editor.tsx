import { useRef, useState } from "react";
import { Tag, X, LayoutTemplate, ChevronDown, Eye, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Input } from "@my-better-t-app/ui/components/input";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { Button } from "@my-better-t-app/ui/components/button";
import { TagBadge } from "@/components/notes/tag-badge";
import type { ApiNote } from "@/lib/api";

interface NoteEditorProps {
  note: ApiNote;
  onUpdate: (fields: { title?: string; content?: string; tags?: string[] }) => void;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "fleeting",   label: "Fleeting Note",   content: "" },
  { id: "literature", label: "Literature Note",  content: "## Resumo\n\n\n## Citação relevante\n\n\n## Minha visão\n\n" },
  { id: "permanent",  label: "Permanent Note",   content: "## Ideia principal\n\n\n## Evidência / Raciocínio\n\n\n## Conexões\n\n" },
  { id: "project",    label: "Projeto",          content: "## Objetivo\n\n\n## Por que isso importa\n\n\n## Próximos passos\n- [ ] \n\n## Referências\n\n" },
  { id: "area",       label: "Área",             content: "## Descrição\n\n\n## Padrões e responsabilidades\n\n\n## Referências\n\n" },
  { id: "resource",   label: "Recurso",          content: "## Sobre o recurso\n\n\n## Pontos principais\n\n\n## Aplicação prática\n\n" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  // Local state — parent re-renders (e.g., after auto-save) don't touch the inputs
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [tagInput, setTagInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [preview, setPreview] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    onUpdate({ title: e.target.value });
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    onUpdate({ content: e.target.value });
  }

  function applyTemplate(templateContent: string) {
    setContent(templateContent);
    onUpdate({ content: templateContent });
    setShowTemplates(false);
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

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <input
        className="w-full bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/40 outline-none border-none resize-none"
        value={title}
        onChange={handleTitleChange}
        placeholder="Título da nota…"
      />

      {/* Content toolbar */}
      <div className="flex items-center justify-between -mb-2">
        <span className="text-[11px] text-muted-foreground">Conteúdo</span>
        <div className="flex items-center gap-1">
          {/* Template picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => { setShowTemplates((v) => !v); setPreview(false); }}
            >
              <LayoutTemplate className="size-3" />
              Templates
              <ChevronDown className="size-3" />
            </Button>
            {showTemplates && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
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

          {/* Preview toggle */}
          <Button
            variant={preview ? "default" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={() => { setPreview((v) => !v); setShowTemplates(false); }}
          >
            {preview ? <Pencil className="size-3" /> : <Eye className="size-3" />}
            {preview ? "Editar" : "Preview"}
          </Button>
        </div>
      </div>

      {/* Content — edit or preview */}
      {preview ? (
        <div
          className="min-h-[380px] rounded-xl border border-border bg-card p-4 text-sm leading-relaxed prose-note overflow-auto cursor-text"
          onClick={() => setPreview(false)}
        >
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-0 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-3 text-foreground">{children}</h3>,
                p: ({ children }) => <p className="mb-3 text-foreground/90 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-foreground/90">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground/90">{children}</ol>,
                li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground mb-3">{children}</blockquote>,
                code: ({ children, className }) => className
                  ? <code className="block bg-muted rounded-lg p-3 text-xs font-mono overflow-auto mb-3">{children}</code>
                  : <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                a: ({ children, href }) => <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">{children}</a>,
                hr: () => <hr className="border-border my-4" />,
                input: ({ type, checked }) => type === "checkbox"
                  ? <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-primary" />
                  : null,
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground/50 italic text-sm">Sem conteúdo. Clique para editar.</p>
          )}
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={handleContentChange}
          placeholder={"Escreva o conteúdo da nota…\n\nSuporta Markdown."}
          className="min-h-[380px] resize-none rounded-xl bg-card font-mono text-sm leading-relaxed border-border focus-visible:ring-primary/50"
          onClick={() => setShowTemplates(false)}
        />
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
                aria-label={`Remover ${tag}`}
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
            placeholder={note.tags.length === 0 ? "Adicionar tag…" : ""}
            className="border-none bg-transparent shadow-none h-6 px-0 text-[11px] min-w-24 flex-1 focus-visible:ring-0"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Pressione Enter ou vírgula para adicionar. Backspace para remover.
        </p>
      </div>
    </div>
  );
}

export function NoteEditorSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-3/4 rounded-lg" />
      <Skeleton className="h-[380px] w-full rounded-xl" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
