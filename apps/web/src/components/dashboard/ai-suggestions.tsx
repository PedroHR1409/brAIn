import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Link, Archive, ChevronRight, Zap, BookOpen, AlertTriangle, Network } from "lucide-react";
import { cn } from "@my-better-t-app/ui/lib/utils";
import type { AiSuggestion } from "@/types/brain";
import type { ApiVaultStats } from "@/lib/api";

interface AiSuggestionsProps {
  stats?: ApiVaultStats | null;
}

function buildSuggestions(stats: ApiVaultStats | null | undefined): AiSuggestion[] {
  const items: AiSuggestion[] = [];

  if (!stats || stats.total === 0) {
    return [
      {
        id: "start",
        type: "process",
        title: "Start capturing your first notes",
        description: "Use Quick Capture (Ctrl+C) to add fleeting thoughts. Your Second Brain starts with a single note.",
        priority: "high",
      },
      {
        id: "link",
        type: "link",
        title: "Connect ideas via Knowledge Graph",
        description: "Use [[wikilinks]] in notes to link related ideas and discover patterns in your knowledge.",
        priority: "medium",
      },
    ];
  }

  const { total, permanent, fleeting, pending, connections, healthScore } = stats;
  const connRatio = connections / total;
  const permRatio = permanent / total;

  // Urgent: many pending notes
  if (pending >= 5) {
    items.push({
      id: "process-urgent",
      type: "process",
      title: `${pending} Fleeting Notes piling up`,
      description: "Your inbox needs attention. Process, promote, or archive to keep your Second Brain healthy.",
      priority: "high",
    });
  } else if (pending > 0) {
    items.push({
      id: "process",
      type: "process",
      title: `${pending} Fleeting Note${pending > 1 ? "s" : ""} waiting to be processed`,
      description: "Promote strong ideas to Permanent, archive reference material, or delete noise.",
      priority: pending >= 3 ? "high" : "medium",
    });
  }

  // Low health score
  if (healthScore < 40) {
    items.push({
      id: "health",
      type: "archive",
      title: `Vault health at ${healthScore}% — needs work`,
      description: "Process pending notes, link ideas together, and promote key insights to Permanent status.",
      priority: "high",
    });
  }

  // Very few connections relative to notes
  if (total >= 5 && connections === 0) {
    items.push({
      id: "link-zero",
      type: "link",
      title: "No connections yet — start linking",
      description: "Add [[wikilinks]] between related notes. Connected knowledge is exponentially more valuable.",
      priority: "high",
    });
  } else if (total >= 10 && connRatio < 0.4) {
    items.push({
      id: "link-low",
      type: "link",
      title: `${connections} connection${connections !== 1 ? "s" : ""} across ${total} notes — add more`,
      description: "Most of your notes are isolated. Use [[wikilinks]] to weave them into a connected knowledge base.",
      priority: "medium",
    });
  }

  // Few permanent notes
  if (total >= 10 && permRatio < 0.15) {
    items.push({
      id: "expand",
      type: "expand",
      title: permanent === 0
        ? "No Permanent Notes yet"
        : `Only ${permanent} Permanent note${permanent !== 1 ? "s" : ""} (${Math.round(permRatio * 100)}% of vault)`,
      description: "Permanent notes are the evergreen core of your Second Brain. Promote your best Literature and Fleeting notes.",
      priority: permanent === 0 ? "high" : "medium",
    });
  }

  // Vault is healthy — positive reinforcement
  if (items.length === 0 && healthScore >= 70) {
    items.push({
      id: "healthy",
      type: "link",
      title: `Vault health: ${healthScore}% — looking great`,
      description: `${total} notes, ${connections} connections, ${permanent} permanent. Keep building momentum.`,
      priority: "low",
    });
  }

  // Explore graph if well connected
  if (connRatio >= 0.6 && total >= 10) {
    items.push({
      id: "graph",
      type: "link",
      title: "Explore your Knowledge Graph",
      description: `${connections} connections across ${total} notes. Visualize clusters and find unexpected links.`,
      priority: "low",
    });
  }

  // Grow permanent notes if reasonable ratio but could be more
  if (permRatio >= 0.15 && permRatio < 0.4 && total >= 10) {
    items.push({
      id: "expand-more",
      type: "expand",
      title: "Keep growing your Permanent Notes",
      description: `${permanent} permanent notes so far. Aim for 30–40% of your vault to be evergreen knowledge.`,
      priority: "low",
    });
  }

  // Archive review (fill to at least 2 suggestions)
  if (items.length < 2) {
    items.push({
      id: "archive",
      type: "archive",
      title: "Review your Archive",
      description: "Archived notes can be a goldmine — browse occasionally to resurface old ideas worth revisiting.",
      priority: "low",
    });
  }

  return items.slice(0, 4);
}

type InboxSearch = { para: "project" | "area" | "resource" | "archive" | undefined; type: "fleeting" | "literature" | "permanent" | undefined };
type Destination =
  | { to: "/graph" }
  | { to: "/inbox"; search: InboxSearch };

const DESTINATION: Record<AiSuggestion["type"], Destination> = {
  link:    { to: "/graph" },
  process: { to: "/inbox", search: { para: undefined, type: undefined } },
  expand:  { to: "/inbox", search: { para: undefined, type: "permanent" } },
  archive: { to: "/inbox", search: { para: "archive", type: undefined } },
};

const suggestionIcon: Record<AiSuggestion["type"], React.ReactNode> = {
  link:    <Network className="size-3.5" />,
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

export function AiSuggestions({ stats }: AiSuggestionsProps) {
  const navigate = useNavigate();
  const items = buildSuggestions(stats);

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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              navigate(dest as any);
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
