import { Link2, Unlink, ArrowRight, ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { NoteConnection } from "@/hooks/use-connections";

interface ConnectionsPanelProps {
  connections: NoteConnection[];
  loading: boolean;
  onRemove: (id: string) => void;
}

const typeColors: Record<string, string> = {
  fleeting: "text-note-fleeting",
  literature: "text-note-literature",
  permanent: "text-note-permanent",
};

export function ConnectionsPanel({
  connections,
  loading,
  onRemove,
}: ConnectionsPanelProps) {
  const navigate = useNavigate();

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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-3 text-center">
          Nenhuma conexão ainda.
        </p>
      ) : (
        <div className="space-y-1.5">
          {connections.map((conn) => (
            <ConnectionItem
              key={conn.id}
              conn={conn}
              onNavigate={() =>
                navigate({ to: "/notes/$id", params: { id: conn.note.id } })
              }
              onRemove={() => onRemove(conn.id)}
            />
          ))}
        </div>
      )}
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
    conn.direction === "from"
      ? ArrowRight
      : conn.direction === "to"
        ? ArrowLeft
        : ArrowLeftRight;

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 hover:border-primary/40 transition-colors">
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <button
        onClick={onNavigate}
        className={cn(
          "flex-1 text-left text-[11px] font-medium line-clamp-1",
          typeColors[conn.note.type] ?? "text-foreground",
        )}
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
