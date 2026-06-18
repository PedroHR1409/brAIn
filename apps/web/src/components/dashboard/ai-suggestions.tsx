import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Link, Archive, ChevronRight, Zap, BookOpen } from "lucide-react";
import { cn } from "@my-better-t-app/ui/lib/utils";
import type { AiSuggestion } from "@/types/brain";

interface AiSuggestionsProps {
  inboxCount?: number;
  suggestions?: AiSuggestion[];
}

function buildSuggestions(inboxCount: number): AiSuggestion[] {
  const items: AiSuggestion[] = [
    {
      id: "1",
      type: "link",
      title: "Connect notes via Knowledge Graph",
      description:
        'Use [[wikilinks]] in your notes to link related ideas and visualize connections in the graph.',
      priority: "high",
    },
  ];

  if (inboxCount > 0) {
    items.push({
      id: "2",
      type: "process",
      title: `${inboxCount} Fleeting Note${inboxCount > 1 ? "s" : ""} waiting to be processed`,
      description:
        "Promote, archive, or delete to keep your inbox clean. Fleeting notes older than 48h need attention.",
      priority: "high",
    });
  }

  items.push(
    {
      id: "3",
      type: "expand",
      title: "Grow your Permanent Notes",
      description:
        "Permanent notes are the core of your Second Brain. Promote strong Fleeting and Literature notes to deepen your knowledge library.",
      priority: "medium",
    },
    {
      id: "4",
      type: "archive",
      title: "Review your Archive",
      description:
        "Archived notes can be a goldmine — browse occasionally to rediscover old ideas or promote them back.",
      priority: "low",
    },
  );

  return items;
}

const DESTINATION: Record<AiSuggestion["type"], string> = {
  link:    "/graph",
  process: "/inbox",
  expand:  "/inbox?type=permanent",
  archive: "/inbox?para=archive",
};

const suggestionIcon: Record<AiSuggestion["type"], React.ReactNode> = {
  link:    <Link className="size-3.5" />,
  process: <Zap className="size-3.5" />,
  expand:  <BookOpen className="size-3.5" />,
  archive: <Archive className="size-3.5" />,
};

const priorityColors: Record<AiSuggestion["priority"], string> = {
  high:   "border-destructive/30 bg-destructive/5",
  medium: "border-note-fleeting/25 bg-note-fleeting/5",
  low:    "border-border bg-muted/30",
};

const priorityDot: Record<AiSuggestion["priority"], string> = {
  high:   "bg-destructive",
  medium: "bg-note-fleeting",
  low:    "bg-muted-foreground",
};

export function AiSuggestions({ inboxCount = 0, suggestions }: AiSuggestionsProps) {
  const navigate = useNavigate();
  const items = suggestions ?? buildSuggestions(inboxCount);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-card-foreground">Suggestions</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">PKM · PARA + Zettelkasten</span>
      </div>

      <div className="space-y-2">
        {items.map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            onClick={() => {
              const dest = DESTINATION[s.type];
              if (dest.includes("?")) {
                const [path, qs] = dest.split("?");
                const params = Object.fromEntries(new URLSearchParams(qs));
                navigate({ to: path, search: params });
              } else {
                navigate({ to: dest });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: AiSuggestion;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 cursor-pointer",
        priorityColors[suggestion.priority],
      )}
    >
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {suggestionIcon[suggestion.type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("size-1.5 rounded-full shrink-0", priorityDot[suggestion.priority])} />
          <p className="text-xs font-medium text-card-foreground line-clamp-1">{suggestion.title}</p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {suggestion.description}
        </p>
      </div>

      <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </button>
  );
}
