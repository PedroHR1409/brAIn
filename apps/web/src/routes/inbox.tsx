import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Inbox, AlertTriangle, CheckCircle, Briefcase, Globe,
  BookOpen, Archive, Plus, Zap, BookMarked, Sparkles, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { brainEvents } from "@/lib/events";
import { toast } from "sonner";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Button } from "@my-better-t-app/ui/components/button";
import { NoteCard } from "@/components/notes/note-card";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { useNotes, useProcessNote } from "@/hooks/use-notes";
import { api } from "@/lib/api";
import type { ApiNote } from "@/lib/api";

// ─── Types & metadata ─────────────────────────────────────────────────────────

type ParaCategory = "project" | "area" | "resource" | "archive";
type NoteTypeFilter = "permanent" | "literature" | "fleeting";
type FilterType = "all" | "fleeting" | "literature" | "permanent";

const PARA_META: Record<ParaCategory, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  project:  { label: "Projects",  icon: Briefcase, description: "Notes linked to active projects" },
  area:     { label: "Areas",     icon: Globe,     description: "Areas of responsibility and interest" },
  resource: { label: "Resources", icon: BookOpen,  description: "Reference material and research" },
  archive:  { label: "Archive",   icon: Archive,   description: "Archived and inactive items" },
};

const TYPE_META: Record<NoteTypeFilter, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  permanent: { label: "Permanent Notes", icon: Zap,       description: "Refined, processed knowledge — your library of lasting ideas" },
  literature: { label: "Literature Notes", icon: BookMarked, description: "Processed references — summaries and syntheses from external sources" },
  fleeting:   { label: "Fleeting Notes",   icon: Inbox,     description: "Quick captures — raw ideas waiting to be processed" },
};

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "fleeting",  label: "Fleeting" },
  { value: "literature",label: "Literature" },
  { value: "permanent", label: "Permanent" },
];

export const Route = createFileRoute("/inbox")({
  validateSearch: (search: Record<string, unknown>) => ({
    para: (search.para as ParaCategory | undefined) ?? undefined,
    type: (search.type as NoteTypeFilter | undefined) ?? undefined,
  }),
  component: InboxPage,
});

function isOverdue(note: ApiNote): boolean {
  const age = Date.now() - new Date(note.updatedAt).getTime();
  return note.type === "fleeting" && age > 48 * 3600 * 1000;
}

// ─── AI Suggestions panel ─────────────────────────────────────────────────────

function AISuggestionsPanel({ onClose }: { onClose: () => void }) {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const { data } = await api.notes.list({ limit: 100 });
      const notes = data.map((n) => ({ title: n.title, type: n.type, tags: n.tags }));
      const result = await api.ai.suggestAreas(notes);
      setSuggestions(result.suggestions);
    } catch {
      toast.error("AI suggestion failed. Make sure ANTHROPIC_API_KEY is configured in Railway.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-card shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-primary/5">
        <Sparkles className="size-4 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">AI Area Suggestions</p>
          <p className="text-[10px] text-muted-foreground">
            AI analyzes your notes and suggests meaningful Areas to organize them
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>

      <div className="p-4">
        {!suggestions && !loading && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Click below to analyze your notes and get area organization suggestions.
            </p>
            <Button size="sm" onClick={fetchSuggestions} className="gap-2">
              <Sparkles className="size-3.5" />
              Get Suggestions
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Analyzing your notes…</p>
          </div>
        )}

        {suggestions && (
          <div className="prose-sm text-sm leading-relaxed max-h-96 overflow-y-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => <h2 className="text-sm font-semibold mb-1 mt-4 first:mt-0 text-foreground">{children}</h2>,
                p: ({ children }) => <p className="mb-2 text-foreground/80 text-xs">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-foreground/80 text-xs">{children}</ul>,
                li: ({ children }) => <li className="text-foreground/80 text-xs">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              }}
            >
              {suggestions}
            </ReactMarkdown>
            <Button variant="outline" size="sm" onClick={fetchSuggestions} className="gap-1.5 mt-3">
              <Sparkles className="size-3" />
              Refresh
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Extra type filter only shown in Resources view
const RESOURCE_TYPE_FILTERS: { value: "all" | NoteTypeFilter; label: string }[] = [
  { value: "all",        label: "All" },
  { value: "literature", label: "Literature" },
  { value: "permanent",  label: "Permanent" },
  { value: "fleeting",   label: "Fleeting" },
];

const ARCHIVE_TAG_FILTERS = [
  { value: "",           label: "All archived" },
  { value: "daily-note", label: "Daily Notes" },
] as const;

function InboxPage() {
  const navigate = useNavigate();
  const { para, type } = Route.useSearch();
  const [filter, setFilter] = useState<FilterType>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<"all" | NoteTypeFilter>("all");
  const [archiveTagFilter, setArchiveTagFilter] = useState<string>("");
  const [showAI, setShowAI] = useState(false);

  const notesParams = type
    ? { type }
    : para === "archive" && archiveTagFilter
    ? { status: "archived", tag: archiveTagFilter }
    : para === "archive"
    ? { status: "archived" }
    : para === "resource" && resourceTypeFilter !== "all"
    ? { para, type: resourceTypeFilter }
    : para
    ? { para }
    : { status: "inbox" };

  const { notes: allNotes, loading } = useNotes(notesParams);
  const { process, loading: processing } = useProcessNote();

  // Only apply local filter in inbox mode (not PARA/type views)
  const filtered = (!para && !type && filter !== "all")
    ? allNotes.filter((n) => n.type === filter)
    : allNotes;

  const overdueNotes = allNotes.filter(isOverdue);
  const overdueCount = overdueNotes.length;

  async function handleProcessOverdue() {
    try {
      await Promise.all(overdueNotes.map((n) => process(n.id, { type: "permanent" })));
      toast.success(`${overdueCount} note${overdueCount > 1 ? "s" : ""} processed!`);
    } catch {
      toast.error("Error processing notes.");
    }
  }

  const PageIcon = type ? TYPE_META[type].icon : para ? PARA_META[para].icon : Inbox;
  const title = type ? TYPE_META[type].label : para ? PARA_META[para].label : "Inbox";
  const description = type
    ? TYPE_META[type].description
    : para
    ? PARA_META[para].description
    : "Process Fleeting Notes — promote, archive, or discard";

  const emptyMessage = type
    ? `No ${TYPE_META[type].label} yet.`
    : para
    ? `No notes in ${PARA_META[para].label} yet.`
    : filter !== "all"
    ? `No ${filter} notes.`
    : "Inbox clear! All processed.";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-note-literature/15">
          <PageIcon className="size-5 text-note-literature" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {!loading && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                {filtered.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* AI button — only for Areas */}
          {para === "area" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowAI((v) => !v)}
            >
              <Sparkles className="size-3.5" />
              AI Suggestions
            </Button>
          )}
          {(para || type) && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => brainEvents.emit("open-capture", para ? { para } : {})}
            >
              <Plus className="size-3.5" />
              New note
            </Button>
          )}
        </div>
      </div>

      {/* AI Suggestions panel */}
      {showAI && para === "area" && (
        <AISuggestionsPanel onClose={() => setShowAI(false)} />
      )}

      {/* Archive tag filter — Daily Notes, etc. */}
      {para === "archive" && (
        <div className="flex gap-1.5 flex-wrap">
          {ARCHIVE_TAG_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setArchiveTagFilter(value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                archiveTagFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Resource type filter — shown only in Resources view */}
      {para === "resource" && (
        <div className="flex gap-1.5 flex-wrap">
          {RESOURCE_TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setResourceTypeFilter(value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                resourceTypeFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Overdue warning — inbox only */}
      {!para && !type && !loading && overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-note-fleeting/25 bg-note-fleeting/8 px-4 py-3">
          <AlertTriangle className="size-4 text-note-fleeting shrink-0" />
          <p className="text-xs text-note-fleeting">
            <strong>{overdueCount}</strong> fleeting note{overdueCount > 1 ? "s" : ""} older than 48h need processing.
          </p>
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto text-note-fleeting hover:text-note-fleeting"
            onClick={handleProcessOverdue}
            disabled={processing}
          >
            Process all
          </Button>
        </div>
      )}

      {/* Filters — inbox mode only */}
      {!para && !type && (
        <div className="flex gap-1.5">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Note list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => navigate({ to: "/notes/$id", params: { id: note.id } })}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <CheckCircle className="size-8 text-note-permanent" />
          <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
          <p className="text-xs text-muted-foreground">
            Use Quick Capture to add new ideas.
          </p>
        </div>
      )}
    </div>
  );
}
