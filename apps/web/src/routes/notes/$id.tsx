import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@my-better-t-app/ui/components/button";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { NoteEditor, NoteEditorSkeleton } from "@/components/notes/note-editor";
import { NoteMetaSidebar } from "@/components/notes/note-meta-sidebar";
import { useNote } from "@/hooks/use-note";
import { useConnections } from "@/hooks/use-connections";
import { useDeleteNote } from "@/hooks/use-notes";
import { api } from "@/lib/api";

export const Route = createFileRoute("/notes/$id")({
  component: NoteDetailPage,
});

function NoteDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();

  const { note, loading, saving, error, update, processNote } = useNote(id);
  const { connections, loading: connLoading, remove: removeConnection } = useConnections(id);
  const { remove: deleteNote } = useDeleteNote();

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteNote(id);
      toast.success("Nota excluída.");
      navigate({ to: "/" });
    } catch {
      toast.error("Erro ao excluir nota.");
    }
  }

  async function handleArchive() {
    try {
      await api.notes.update(id, { status: "archived" });
      toast.success("Nota arquivada.");
      navigate({ to: "/inbox" });
    } catch {
      toast.error("Erro ao arquivar nota.");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center space-y-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.history.back()}
        >
          <ArrowLeft className="size-3.5" />
          Voltar
        </Button>

        <div className="flex items-center gap-2 ml-auto text-[11px] text-muted-foreground">
          {saving && (
            <>
              <Loader2 className="size-3 animate-spin" />
              Salvando…
            </>
          )}
          {!saving && !loading && (
            <span className="text-note-permanent">Salvo</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-6 items-start">
        {/* Main editor */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <NoteEditorSkeleton />
          ) : note ? (
            <NoteEditor
              note={note}
              onUpdate={update}
            />
          ) : null}
        </main>

        {/* Meta sidebar */}
        <div className="w-64 shrink-0 hidden lg:block">
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-6 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-16 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          ) : note ? (
            <NoteMetaSidebar
              note={note}
              saving={saving}
              connections={connections}
              connectionsLoading={connLoading}
              onUpdate={update}
              onProcess={processNote}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onRemoveConnection={removeConnection}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
