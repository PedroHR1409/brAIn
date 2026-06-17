import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Brain, Activity } from "lucide-react";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { ChatInterface } from "@/components/ai/chat-interface";
import { SuggestedPrompts } from "@/components/ai/suggested-prompts";
import { useVaultStats } from "@/hooks/use-vault-stats";

export const Route = createFileRoute("/ai")({
  component: AiStudioPage,
});

function AiStudioPage() {
  const { stats } = useVaultStats();
  const [pendingInput, setPendingInput] = useState<string | undefined>();

  return (
    <div className="flex h-full">
      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0 px-6 py-6 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Studio</h1>
            <p className="text-xs text-muted-foreground">
              Assistente PKM · PARA + Zettelkasten
            </p>
          </div>
          {stats && (
            <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
              <Brain className="size-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">
                {stats.total} notas
              </span>
              <span className="text-muted-foreground/40">·</span>
              <Activity className="size-3.5 text-note-permanent" />
              <span className="text-[11px] text-note-permanent font-medium">
                {stats.healthScore}%
              </span>
            </div>
          )}
        </div>

        {/* Chat — fills remaining height */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            vaultStats={stats}
            initialInput={pendingInput}
            onInitialInputConsumed={() => setPendingInput(undefined)}
          />
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="hidden xl:flex w-64 shrink-0 flex-col gap-5 border-l border-border bg-sidebar px-4 py-6">
        <SuggestedPrompts onSelect={(text) => setPendingInput(text)} />

        <Separator />

        {/* Vault context */}
        {stats && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
              Contexto da Vault
            </p>
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <StatRow label="Total de notas" value={stats.total} />
              <StatRow label="Permanent Notes" value={stats.permanent} color="text-note-permanent" />
              <StatRow label="Literature Notes" value={stats.literature} color="text-note-literature" />
              <StatRow label="Pendentes" value={stats.pending} color="text-note-fleeting" />
              <Separator />
              <StatRow label="Saúde" value={`${stats.healthScore}%`} color="text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground px-1">
              Contexto enviado automaticamente para o assistente.
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Dicas
          </p>
          <ul className="space-y-2 text-[11px] text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary shrink-0">→</span>
              Cole o conteúdo de uma nota para processá-la
            </li>
            <li className="flex gap-2">
              <span className="text-primary shrink-0">→</span>
              Peça para criar conexões entre duas ideias
            </li>
            <li className="flex gap-2">
              <span className="text-primary shrink-0">→</span>
              Shift+Enter para nova linha na mensagem
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function StatRow({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
