import { Sparkles, Link, Archive, ChevronRight, Zap, BookOpen } from "lucide-react";
import { Button } from "@my-better-t-app/ui/components/button";
import { cn } from "@my-better-t-app/ui/lib/utils";
import type { AiSuggestion } from "@/types/brain";

const DEMO_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "1",
    type: "link",
    title: "Conectar 3 notas sobre PKM",
    description:
      'As notas "Zettelkasten", "PARA method" e "Building a Second Brain" compartilham contexto similar.',
    priority: "high",
  },
  {
    id: "2",
    type: "process",
    title: "Processar 12 Fleeting Notes",
    description:
      "Você tem notas com mais de 48h pendentes de processamento. Promova ou arquive.",
    priority: "high",
  },
  {
    id: "3",
    type: "expand",
    title: "Expandir nota sobre aprendizado deliberado",
    description:
      'A nota "Prática deliberada" tem força baixa e pode virar uma Permanent Note mais robusta.',
    priority: "medium",
  },
  {
    id: "4",
    type: "archive",
    title: "Arquivar projeto concluído",
    description:
      'O projeto "Refactor API" foi marcado como concluído há 30 dias. Mova para Archive.',
    priority: "low",
  },
];

const suggestionIcon: Record<AiSuggestion["type"], React.ReactNode> = {
  link: <Link className="size-3.5" />,
  process: <Zap className="size-3.5" />,
  expand: <BookOpen className="size-3.5" />,
  archive: <Archive className="size-3.5" />,
};

const priorityColors: Record<AiSuggestion["priority"], string> = {
  high: "border-destructive/30 bg-destructive/5",
  medium: "border-note-fleeting/25 bg-note-fleeting/5",
  low: "border-border bg-muted/30",
};

const priorityDot: Record<AiSuggestion["priority"], string> = {
  high: "bg-destructive",
  medium: "bg-note-fleeting",
  low: "bg-muted-foreground",
};

interface AiSuggestionsProps {
  suggestions?: AiSuggestion[];
}

export function AiSuggestions({ suggestions = DEMO_SUGGESTIONS }: AiSuggestionsProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-card-foreground">
          Sugestões da IA
        </h2>
        <span className="ml-auto text-[10px] text-muted-foreground">
          PKM · PARA + Zettelkasten
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.map((s) => (
          <SuggestionCard key={s.id} suggestion={s} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: AiSuggestion }) {
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 cursor-pointer",
        priorityColors[suggestion.priority],
      )}
    >
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {suggestionIcon[suggestion.type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={cn(
              "size-1.5 rounded-full shrink-0",
              priorityDot[suggestion.priority],
            )}
          />
          <p className="text-xs font-medium text-card-foreground line-clamp-1">
            {suggestion.title}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {suggestion.description}
        </p>
      </div>

      <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </div>
  );
}
