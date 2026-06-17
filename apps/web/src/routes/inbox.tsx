import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Button } from "@my-better-t-app/ui/components/button";
import { NoteCard } from "@/components/notes/note-card";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { useNotes, useProcessNote } from "@/hooks/use-notes";
import type { ApiNote } from "@/lib/api";

export const Route = createFileRoute("/inbox")({
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
  const [filter, setFilter] = useState<FilterType>("all");

  const { notes: allNotes, loading } = useNotes({ status: "inbox" });
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-note-literature/15">
          <Inbox className="size-5 text-note-literature" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">Inbox</h1>
            {!loading && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                {allNotes.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Processar Fleeting Notes — promova, arquive ou descarte
          </p>
        </div>
      </div>

      {/* Overdue warning */}
      {!loading && overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-note-fleeting/25 bg-note-fleeting/8 px-4 py-3">
          <AlertTriangle className="size-4 text-note-fleeting shrink-0" />
          <p className="text-xs text-note-fleeting">
            <strong>{overdueCount}</strong> notas fugazes com mais de 48h
            pendentes de processamento.
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
              ? "Inbox vazio! Tudo processado."
              : `Nenhuma nota do tipo ${filter} no inbox.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Use a Captura rápida para adicionar novas ideias.
          </p>
        </div>
      )}
    </div>
  );
}
