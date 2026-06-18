import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, AlertTriangle, CheckCircle, Briefcase, Globe, BookOpen, Archive, Plus, Zap, BookMarked } from "lucide-react";
import { brainEvents } from "@/lib/events";
import { toast } from "sonner";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Button } from "@my-better-t-app/ui/components/button";
import { NoteCard } from "@/components/notes/note-card";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { useNotes, useProcessNote } from "@/hooks/use-notes";
import type { ApiNote } from "@/lib/api";

type ParaCategory = "project" | "area" | "resource" | "archive";
type NoteTypeFilter = "permanent" | "literature" | "fleeting";

const PARA_META: Record<ParaCategory, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  project: { label: "Projetos", icon: Briefcase, description: "Notas vinculadas a projetos ativos" },
  area: { label: "Áreas", icon: Globe, description: "Áreas de responsabilidade e interesse" },
  resource: { label: "Recursos", icon: BookOpen, description: "Material de referência e pesquisa" },
  archive: { label: "Archive", icon: Archive, description: "Itens arquivados e inativos" },
};

const TYPE_META: Record<NoteTypeFilter, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  permanent: { label: "Notas Permanentes", icon: Zap, description: "Conhecimento refinado e processado — sua biblioteca de ideias duradouras" },
  literature: { label: "Literature Notes", icon: BookMarked, description: "Referências processadas — resumos e sínteses de fontes externas" },
  fleeting: { label: "Fleeting Notes", icon: Inbox, description: "Captura rápida — ideias brutas aguardando processamento" },
};

export const Route = createFileRoute("/inbox")({
  validateSearch: (search: Record<string, unknown>) => ({
    para: (search.para as ParaCategory | undefined) ?? undefined,
    type: (search.type as NoteTypeFilter | undefined) ?? undefined,
  }),
  component: InboxPage,
});

type FilterType = "all" | "fleeting" | "literature" | "permanent";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "fleeting", label: "Fleeting" },
  { value: "literature", label: "Literature" },
  { value: "permanent", label: "Permanent" },
];

function isOverdue(note: ApiNote): boolean {
  const age = Date.now() - new Date(note.updatedAt).getTime();
  return note.type === "fleeting" && age > 48 * 3600 * 1000;
}

function InboxPage() {
  const navigate = useNavigate();
  const { para, type } = Route.useSearch();
  const [filter, setFilter] = useState<FilterType>("all");

  const notesParams = type
    ? { type }
    : para === "archive"
    ? { status: "archived" }
    : para
    ? { para }
    : { status: "inbox" };
  const { notes: allNotes, loading } = useNotes(notesParams);
  const { process, loading: processing } = useProcessNote();

  const filtered =
    filter === "all" ? allNotes : allNotes.filter((n) => n.type === filter);

  const overdueNotes = allNotes.filter(isOverdue);
  const overdueCount = overdueNotes.length;

  async function handleProcessOverdue() {
    try {
      await Promise.all(
        overdueNotes.map((n) => process(n.id, { type: "permanent" })),
      );
      toast.success(`${overdueCount} nota${overdueCount > 1 ? "s" : ""} processada${overdueCount > 1 ? "s" : ""}!`);
    } catch {
      toast.error("Erro ao processar notas.");
    }
  }

  const PageIcon = type ? TYPE_META[type].icon : para ? PARA_META[para].icon : Inbox;
  const title = type ? TYPE_META[type].label : para ? PARA_META[para].label : "Inbox";
  const description = type
    ? TYPE_META[type].description
    : para
    ? PARA_META[para].description
    : "Processar Fleeting Notes — promova, arquive ou descarte";

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
                {allNotes.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {(para || type) && (
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => brainEvents.emit("open-capture", para ? { para } : {})}
          >
            <Plus className="size-3.5" />
            Nova nota
          </Button>
        )}
      </div>

      {/* Overdue warning — only in inbox mode */}
      {!para && !type && !loading && overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-note-fleeting/25 bg-note-fleeting/8 px-4 py-3">
          <AlertTriangle className="size-4 text-note-fleeting shrink-0" />
          <p className="text-xs text-note-fleeting">
            <strong>{overdueCount}</strong> notas fugazes com mais de 48h pendentes de processamento.
          </p>
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto text-note-fleeting hover:text-note-fleeting"
            onClick={handleProcessOverdue}
            disabled={processing}
          >
            Processar
          </Button>
        </div>
      )}

      {/* Filters */}
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
          <p className="text-sm font-medium text-foreground">
            {filter === "all"
              ? type
                ? `Nenhuma ${TYPE_META[type].label} ainda.`
                : para
                ? `Nenhuma nota em ${PARA_META[para].label}.`
                : "Inbox vazio! Tudo processado."
              : `Nenhuma nota do tipo ${filter}.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Use a Captura rápida para adicionar novas ideias.
          </p>
        </div>
      )}
    </div>
  );
}
