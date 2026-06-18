import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, BookOpen, Sun, Moon, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { Button } from "@my-better-t-app/ui/components/button";
import { NoteCard } from "@/components/notes/note-card";
import { useDailyNote } from "@/hooks/use-daily-note";
import { useNotes } from "@/hooks/use-notes";
import { api } from "@/lib/api";

export const Route = createFileRoute("/daily")({
  component: DailyPage,
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DailyPage() {
  const navigate = useNavigate();
  const dateKey = todayISO();

  const dateStr = new Date().toLocaleDateString("en-US", {
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

  async function archiveDailyNote() {
    if (!note.intention && !note.studied && !note.tomorrow) {
      toast.info("Nothing to archive — daily note is empty.");
      return;
    }
    try {
      const content = [
        note.intention && `## Intention\n${note.intention}`,
        note.studied   && `## What I Studied\n${note.studied}`,
        note.tomorrow  && `## For Tomorrow\n${note.tomorrow}`,
      ].filter(Boolean).join("\n\n");

      await api.notes.create({
        title: `Daily Note — ${dateStr}`,
        content,
        type: "permanent",
        status: "archived",
        para: "archive",
        tags: ["daily-note"],
      });

      toast.success("Daily note archived! Find it in Archive → Daily Notes.");
      navigate({ to: "/inbox", search: { para: "archive", type: undefined } });
    } catch {
      toast.error("Failed to archive daily note.");
    }
  }

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
          <h1 className="text-xl font-bold text-foreground capitalize">{dateStr}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saving && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={archiveDailyNote}>
            <Archive className="size-3.5" />
            Archive
          </Button>
        </div>
      </div>

      {/* Morning intention */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="size-4 text-note-fleeting" />
          <h2 className="text-sm font-semibold text-foreground">Today's intention</h2>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <Textarea
            placeholder="What do you want to accomplish today? What energy do you want to bring?"
            value={note.intention}
            onChange={(e) => save({ intention: e.target.value })}
            className="min-h-24 resize-none rounded-xl bg-card"
          />
        )}
      </section>

      <Separator />

      {/* Pending fleeting notes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-note-literature" />
          <h2 className="text-sm font-semibold text-foreground">Pending Fleeting Notes</h2>
          {!notesLoading && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {todayNotes.length} note{todayNotes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {notesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : todayNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No pending fleeting notes.</p>
        ) : (
          <div className="space-y-2">
            {todayNotes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onClick={() => navigate({ to: "/notes/$id", params: { id: n.id } })}
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* What I studied */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-note-permanent" />
          <h2 className="text-sm font-semibold text-foreground">What I studied today</h2>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <Textarea
            placeholder="What topics did you explore? What did you learn?"
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
          <h2 className="text-sm font-semibold text-foreground">For tomorrow</h2>
        </div>
        {loading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <Textarea
            placeholder="What's still pending? What needs attention tomorrow?"
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
