import { Lightbulb, GitMerge, BookOpenCheck, Layers, Zap } from "lucide-react";

interface Prompt {
  icon: React.ReactNode;
  label: string;
  text: string;
}

const PROMPTS: Prompt[] = [
  {
    icon: <Zap className="size-3.5 text-note-fleeting" />,
    label: "Processar ideia",
    text: "Tenho uma ideia nova que quero desenvolver: ",
  },
  {
    icon: <BookOpenCheck className="size-3.5 text-note-literature" />,
    label: "Criar nota permanente",
    text: "Me ajuda a transformar esta anotação de leitura em uma permanent note atômica: ",
  },
  {
    icon: <GitMerge className="size-3.5 text-note-permanent" />,
    label: "Sugerir conexões",
    text: "Quais conexões você enxerga entre estas duas ideias? ",
  },
  {
    icon: <Layers className="size-3.5 text-primary" />,
    label: "Classificar no PARA",
    text: "Como devo classificar esta informação no sistema PARA? ",
  },
  {
    icon: <Lightbulb className="size-3.5 text-muted-foreground" />,
    label: "Sintetizar leitura",
    text: "Acabei de ler um artigo/livro sobre ",
  },
];

interface SuggestedPromptsProps {
  onSelect: (text: string) => void;
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
        Sugestões
      </p>
      <div className="space-y-1">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelect(p.text)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:border-primary/40 hover:bg-accent/50 transition-colors group"
          >
            {p.icon}
            <span className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors">
              {p.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
