import { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@my-better-t-app/ui/components/dialog";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@my-better-t-app/ui/components/native-select";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { useCreateNote } from "@/hooks/use-notes";
import { brainEvents } from "@/lib/events";
import type { NoteType, SourceType } from "@/types/brain";

type ParaCategory = "project" | "area" | "resource" | "archive" | "";

// ─── Templates ────────────────────────────────────────────────────────────────

const TYPE_TEMPLATES: Record<NoteType, string> = {
  fleeting: "",
  literature: "## Summary\n\n\n## Key Quote\n\n\n## My Take\n\n",
  permanent: "## Main Idea\n\n\n## Evidence / Reasoning\n\n\n## Connections\n\n",
};

const TYPE_TITLE_PLACEHOLDER: Record<NoteType, string> = {
  fleeting: "What's on your mind?",
  literature: "Book, article, or podcast title…",
  permanent: "What's the central idea? (be specific)",
};

const PARA_CONFIG: Record<string, { type: NoteType; content: string; titlePlaceholder: string }> = {
  project: {
    type: "permanent",
    content: "## Goal\n\n\n## Why It Matters\n\n\n## Next Steps\n- [ ] \n\n## References\n\n",
    titlePlaceholder: "Project name",
  },
  area: {
    type: "permanent",
    content: "## Description\n\n\n## Standards & Responsibilities\n\n\n## References\n\n",
    titlePlaceholder: "Area name (e.g. Health, Finance, Work)",
  },
  resource: {
    type: "literature",
    content: "## About\n\n\n## Key Points\n\n\n## Practical Application\n\n",
    titlePlaceholder: "Resource or topic name",
  },
  archive: {
    type: "permanent",
    content: "",
    titlePlaceholder: "What are you archiving?",
  },
};

const ALL_TEMPLATES = new Set(
  [
    ...Object.values(TYPE_TEMPLATES),
    ...Object.values(PARA_CONFIG).map((c) => c.content),
  ].filter(Boolean),
);

// ─── Simplified markdown components for the modal ─────────────────────────────

const mdComponents: Parameters<typeof ReactMarkdown>[0]["components"] = {
  h1: ({ children }) => <h1 className="text-sm font-bold mb-1 text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xs font-semibold mb-1 mt-2 text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-semibold mb-0.5 mt-1.5 text-foreground">{children}</h3>,
  p: ({ children }) => <p className="mb-1.5 text-foreground/80 leading-snug">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 text-foreground/80">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 text-foreground/80">{children}</ol>,
  li: ({ children }) => <li className="text-foreground/80">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  code: ({ children }) => <code className="bg-muted px-1 rounded text-[10px] font-mono">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-2 italic text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="border-border my-2" />,
  input: ({ type, checked }) =>
    type === "checkbox" ? <input type="checkbox" checked={checked} readOnly className="mr-1 accent-primary" /> : null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickCaptureModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("fleeting");
  const [sourceType, setSourceType] = useState<SourceType>("other");
  const [para, setPara] = useState<ParaCategory>("");
  const [tags, setTags] = useState("");
  const prevType = useRef<NoteType>("fleeting");

  const { create, loading } = useCreateNote();

  useEffect(() =>
    brainEvents.on("open-capture", (detail?: unknown) => {
      const d = detail as { para?: string } | undefined;
      if (d?.para && d.para in PARA_CONFIG) {
        const cfg = PARA_CONFIG[d.para];
        setPara(d.para as ParaCategory);
        setType(cfg.type);
        setContent(cfg.content);
        prevType.current = cfg.type;
      }
      setOpen(true);
    }),
  []);

  function handleTypeChange(newType: NoteType) {
    setType(newType);
    prevType.current = newType;
    if (!content || ALL_TEMPLATES.has(content)) {
      setContent(TYPE_TEMPLATES[newType]);
    }
  }

  function reset() {
    setTitle("");
    setContent("");
    setTags("");
    setType("fleeting");
    setPara("");
    prevType.current = "fleeting";
  }

  async function handleSave() {
    if (!title.trim() || loading) return;
    try {
      const status = type === "permanent" || !!para ? "active" : undefined;
      await create({
        title,
        content,
        type,
        status,
        sourceType: type === "literature" ? sourceType : undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        para: para || undefined,
      });
      toast.success("Note saved!");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error saving note");
    }
  }

  const paraConfig = para && para in PARA_CONFIG ? PARA_CONFIG[para] : null;
  const titlePlaceholder = paraConfig?.titlePlaceholder ?? TYPE_TITLE_PLACEHOLDER[type];
  const modalTitle = paraConfig
    ? ({ project: "New Project", area: "New Area", resource: "New Resource" }[para as string] ?? "Quick Capture")
    : "Quick Capture";

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="w-full gap-2 rounded-lg"
        onClick={() => setOpen(true)}
      >
        <Zap className="size-3.5" />
        Quick Capture
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent
          className="sm:max-w-lg"
          showCloseButton
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{modalTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Title */}
            <div className="grid gap-1.5">
              <Label htmlFor="note-title">
                {para === "project" ? "Project name *" :
                 para === "area" ? "Area name *" :
                 para === "resource" ? "Resource name *" :
                 "Main idea (one sentence) *"}
              </Label>
              <Input
                id="note-title"
                placeholder={titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Content + live preview */}
            <div className="grid gap-1.5">
              <Label htmlFor="note-content">
                {para ? "Details" : "Details (optional)"}
              </Label>
              <Textarea
                id="note-content"
                placeholder={para ? "" : "Expand the thought…"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32 resize-none font-mono text-xs"
              />
              {/* Live markdown preview */}
              {content.trim() && (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 max-h-32 overflow-y-auto text-xs leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Type + Source/PARA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <NativeSelect
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as NoteType)}
                >
                  <NativeSelectOption value="fleeting">Fleeting Note</NativeSelectOption>
                  <NativeSelectOption value="literature">Literature Note</NativeSelectOption>
                  <NativeSelectOption value="permanent">Permanent Note</NativeSelectOption>
                </NativeSelect>
              </div>

              {type === "literature" ? (
                <div className="grid gap-1.5">
                  <Label>Source</Label>
                  <NativeSelect
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                  >
                    <NativeSelectOption value="article">Article</NativeSelectOption>
                    <NativeSelectOption value="book">Book</NativeSelectOption>
                    <NativeSelectOption value="podcast">Podcast</NativeSelectOption>
                    <NativeSelectOption value="other">Other</NativeSelectOption>
                  </NativeSelect>
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label>PARA Category</Label>
                  <NativeSelect
                    value={para}
                    onChange={(e) => setPara(e.target.value as ParaCategory)}
                  >
                    <NativeSelectOption value="">None</NativeSelectOption>
                    <NativeSelectOption value="project">Project</NativeSelectOption>
                    <NativeSelectOption value="area">Area</NativeSelectOption>
                    <NativeSelectOption value="resource">Resource</NativeSelectOption>
                    <NativeSelectOption value="archive">Archive</NativeSelectOption>
                  </NativeSelect>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="grid gap-1.5">
              <Label htmlFor="note-tags">Tags (comma-separated)</Label>
              <Input
                id="note-tags"
                placeholder="pkm, zettelkasten, productivity"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            {/* Type hint */}
            <p className="text-[10px] text-muted-foreground">
              {type === "fleeting" && (
                <>Saved as <span className="text-note-fleeting font-medium">Fleeting Note</span> — process within 48h.</>
              )}
              {type === "literature" && (
                <>Saved as <span className="text-note-literature font-medium">Literature Note</span> — add source info above.</>
              )}
              {type === "permanent" && (
                <>Saved as <span className="font-medium">Permanent Note</span> — final and processed.</>
              )}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || loading}>
              {loading ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
