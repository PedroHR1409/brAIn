import { Clock, Link } from "lucide-react";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { NoteTypeBadge, NoteTypeStripe } from "@/components/notes/note-type-badge";
import { TagBadge } from "@/components/notes/tag-badge";
import type { ApiNote } from "@/lib/api";

interface NoteCardProps {
  note: ApiNote;
  className?: string;
  onClick?: () => void;
}

export function NoteCard({ note, className, onClick }: NoteCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4 pl-6",
        "transition-all duration-200 group",
        onClick &&
          "cursor-pointer hover:border-primary/50 hover:shadow-[0_0_0_1px_var(--color-primary),0_8px_30px_color-mix(in_oklch,var(--color-primary)_18%,transparent)]",
        className,
      )}
    >
      <NoteTypeStripe type={note.type} />

      <div className="flex items-start justify-between gap-2 mb-2">
        <NoteTypeBadge type={note.type} />
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-1">
            <Link className="size-3" />
            {note.connections}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatTimeAgo(note.updatedAt)}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-card-foreground mb-1.5 line-clamp-1">
        {note.title}
      </h3>

      {note.content && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {note.content}
        </p>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {note.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground py-0.5">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const days = Math.floor(hours / 24);

  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" });
}
