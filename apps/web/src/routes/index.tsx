import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { VaultHealth } from "@/components/dashboard/vault-health";
import { AiSuggestions } from "@/components/dashboard/ai-suggestions";
import { NoteCard } from "@/components/notes/note-card";
import { useNotes } from "@/hooks/use-notes";
import { useVaultStats } from "@/hooks/use-vault-stats";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const { stats, loading: statsLoading } = useVaultStats();
  const { notes, loading: notesLoading } = useNotes({ limit: 6 });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Brain className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Sua Vault</h1>
          <p className="text-xs text-muted-foreground capitalize">{today}</p>
        </div>
      </div>

      {/* Vault Health */}
      <VaultHealth stats={stats} loading={statsLoading} />

      {/* Recent Notes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Notas recentes
          </h2>
          <span className="text-[10px] text-muted-foreground">
            Ver todas →
          </span>
        </div>

        {notesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma nota ainda. Use a captura rápida para começar.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => navigate({ to: "/notes/$id", params: { id: note.id } })}
              />
            ))}
          </div>
        )}
      </section>

      {/* AI Suggestions */}
      <AiSuggestions />
    </div>
  );
}
