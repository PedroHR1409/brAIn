import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, BookOpen, Sun, Moon, Loader2 } from "lucide-react";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { NoteCard } from "@/components/notes/note-card";
import { useDailyNote } from "@/hooks/use-daily-note";
import { useNotes } from "@/hooks/use-notes";

export const Route = createFileRoute("/daily")({
  component: DailyPage,
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DailyPage() {
  const dateKey = todayISO();

  const dateStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { note, loading, saving, save } = useDailyNote(dateKey);
  const { notes: todayNotes, loading: notesLoading } = useNotes({
    type: "fleeting",
    status: "inbox",
    limit: 5,
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-note-permanent/15">
          <CalendarDays className="size-5 text-note-permanent" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Daily Note
          </p>
          <h1 className="text-xl font-bold text-foreground capitalize">
            {dateStr}
          </h1>
        </div>
        {saving && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Salvando…
          </div>
        )}
      </div>

      {/* Morning section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="size-4 text-note-fleeting" />
          <h2 className="text-sm font-semibold text-foreground">
            Intenção do dia
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <Textarea
            placeholder="O que você quer conquistar hoje? Que energia quer trazer?"
            value={note.intention}
            onChange={(e) => save({ intention: e.target.value })}
            className="min-h-24 resize-none rounded-xl bg-card"
          />
        )}
      </section>

      <Separator />

      {/* Fleeting notes of the day */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-note-literature" />
          <h2 className="text-sm font-semibold text-foreground">
            Fleeting Notes pendentes
          </h2>
          {!notesLoading && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {todayNotes.length} nota{todayNotes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {notesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : todayNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma nota fleeting pendente.
          </p>
        ) : (
          <div className="space-y-2">
            {todayNotes.map((note) => (
              <NoteCard key={note.id} note={note} onClick={() => {}} />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* What I studied */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-note-permanent" />
          <h2 className="text-sm font-semibold text-foreground">
            O que estudei hoje
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <Textarea
            placeholder="Quais tópicos você explorou? O que aprendeu?"
            value={note.studied}
            onChange={(e) => save({ studied: e.target.value })}
            className="min-h-24 resize-none rounded-xl bg-card"
          />
        )}
      </section>

      {/* For tomorrow */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Moon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Para processar amanhã
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <Textarea
            placeholder="O que ficou pendente? O que precisa de atenção amanhã?"
            value={note.tomorrow}
            onChange={(e) => save({ tomorrow: e.target.value })}
            className="min-h-20 resize-none rounded-xl bg-card"
          />
        )}
      </section>

      <div className="h-4" />
    </div>
  );
}
