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

  const { note, loading, saving, processing, error, update, processNote } = useNote(id);
  const { connections, loading: connLoading, remove: removeConnection, add: addConnection } = useConnections(id);
  const { remove: deleteNote } = useDeleteNote();

  async function handleDelete() {
    if (!confirm("Delete this note? This action cannot be undone.")) return;
    try {
      await deleteNote(id);
      toast.success("Note deleted.");
      navigate({ to: "/" });
    } catch {
      toast.error("Error deleting note.");
    }
  }

  async function handleArchive() {
    try {
      await api.notes.update(id, { status: "archived", para: "archive" });
      toast.success("Note archived.");
      navigate({ to: "/inbox", search: { para: "archive", type: undefined } });
    } catch {
      toast.error("Error archiving note.");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center space-y-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          Back to home
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
          Back
        </Button>

        <div className="flex items-center gap-2 ml-auto text-[11px] text-muted-foreground">
          {saving && (
            <>
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </>
          )}
          {!saving && !loading && (
            <span className="text-note-permanent">Saved</span>
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
              key={note.id}
              note={note}
              onUpdate={update}
              onAddConnection={addConnection}
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
              processing={processing}
              connections={connections}
              connectionsLoading={connLoading}
              onUpdate={update}
              onProcess={processNote}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onRemoveConnection={removeConnection}
              onAddConnection={addConnection}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
