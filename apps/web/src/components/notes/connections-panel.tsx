import { useState, useEffect, useRef } from "react";
import { Link2, Unlink, ArrowRight, ArrowLeft, ArrowLeftRight, Search, Plus } from "lucide-react";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Input } from "@my-better-t-app/ui/components/input";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { api, type ApiNote } from "@/lib/api";
import type { NoteConnection } from "@/hooks/use-connections";

interface ConnectionsPanelProps {
  noteId: string;
  connections: NoteConnection[];
  loading: boolean;
  onRemove: (id: string) => void;
  onAdd: (toNoteId: string) => Promise<void>;
}

const typeColors: Record<string, string> = {
  fleeting: "text-note-fleeting",
  literature: "text-note-literature",
  permanent: "text-note-permanent",
};

export function ConnectionsPanel({
  noteId,
  connections,
  loading,
  onRemove,
  onAdd,
}: ConnectionsPanelProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiNote[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectedIds = new Set(connections.map((c) => c.note.id));

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.notes.list({ q: query, limit: 8 });
        setResults(data.filter((n) => n.id !== noteId && !connectedIds.has(n.id)));
      } finally {
        setSearching(false);
      }
    }, 250);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, noteId]);

  async function handleAdd(toNoteId: string) {
    setAdding(true);
    try {
      await onAdd(toNoteId);
      setQuery("");
      setResults([]);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link2 className="size-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Conexões
        </h3>
        {!loading && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {connections.length}
          </span>
        )}
      </div>

      {/* Existing connections */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-1 text-center">
          Nenhuma conexão ainda.
        </p>
      ) : (
        <div className="space-y-1.5">
          {connections.map((conn) => (
            <ConnectionItem
              key={conn.id}
              conn={conn}
              onNavigate={() => navigate({ to: "/notes/$id", params: { id: conn.note.id } })}
              onRemove={() => onRemove(conn.id)}
            />
          ))}
        </div>
      )}

      {/* Search to add connection */}
      <div className="relative">
        <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 px-2 py-1.5">
          <Search className="size-3 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Conectar nota…"
            className="h-5 border-none bg-transparent shadow-none p-0 text-[11px] focus-visible:ring-0 placeholder:text-muted-foreground/60"
            disabled={adding}
          />
          {searching && (
            <div className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
          )}
        </div>

        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            {results.map((note) => (
              <button
                key={note.id}
                onClick={() => handleAdd(note.id)}
                disabled={adding}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Plus className="size-3 text-muted-foreground shrink-0" />
                <span className={cn("flex-1 text-[11px] font-medium line-clamp-1", typeColors[note.type] ?? "text-foreground")}>
                  {note.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionItem({
  conn,
  onNavigate,
  onRemove,
}: {
  conn: NoteConnection;
  onNavigate: () => void;
  onRemove: () => void;
}) {
  const Icon =
    conn.direction === "from" ? ArrowRight : conn.direction === "to" ? ArrowLeft : ArrowLeftRight;

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 hover:border-primary/40 transition-colors">
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <button
        onClick={onNavigate}
        className={cn("flex-1 text-left text-[11px] font-medium line-clamp-1", typeColors[conn.note.type] ?? "text-foreground")}
      >
        {conn.note.title}
      </button>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        aria-label="Remover conexão"
      >
        <Unlink className="size-3" />
      </button>
    </div>
  );
}
