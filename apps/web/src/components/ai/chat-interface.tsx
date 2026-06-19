import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Bot, User, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@my-better-t-app/ui/components/button";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { cn } from "@my-better-t-app/ui/lib/utils";
import type { ApiVaultStats } from "@/lib/api";

const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const BASE = rawApiUrl
  ? rawApiUrl.startsWith("http") ? rawApiUrl : `https://${rawApiUrl}`
  : "http://localhost:3000";

interface ChatInterfaceProps {
  vaultStats: ApiVaultStats | null;
  initialInput?: string;
  onInitialInputConsumed?: () => void;
}

export function ChatInterface({
  vaultStats,
  initialInput,
  onInitialInputConsumed,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${BASE}/ai/chat`,
      body: vaultStats
        ? {
            vaultContext: {
              total: vaultStats.total,
              permanent: vaultStats.permanent,
              fleeting: vaultStats.fleeting,
              pending: vaultStats.pending,
              healthScore: vaultStats.healthScore,
            },
          }
        : {},
    }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Apply initialInput when it changes
  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
      onInitialInputConsumed?.();
    }
  }, [initialInput, onInitialInputConsumed]);

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role as "user" | "assistant"}
              text={m.parts
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("")}
            />
          ))
        )}

        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs pl-10">
            <Loader2 className="size-3 animate-spin" />
            <span>brAIn está pensando…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            {error.message || "Erro na resposta da IA. Verifique se a ANTHROPIC_API_KEY está configurada."}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva sua mensagem… (Enter para enviar, Shift+Enter para nova linha)"
          className="min-h-[52px] max-h-40 resize-none rounded-xl bg-card text-sm border-border focus-visible:ring-primary/50"
          disabled={isStreaming}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          size="icon"
          className="h-[52px] w-12 shrink-0 rounded-xl"
        >
          {isStreaming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-primary",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm",
        )}
      >
        <MarkdownText text={text} />
      </div>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("---")) return <hr key={i} className="border-border my-2" />;
        if (line.startsWith("### ")) return <p key={i} className="text-xs font-semibold text-foreground mt-2">{line.slice(4)}</p>;
        if (line.startsWith("## "))  return <p key={i} className="text-sm font-bold text-foreground mt-3">{line.slice(3)}</p>;
        if (line.startsWith("# "))   return <p key={i} className="text-base font-bold text-foreground mt-3">{line.slice(2)}</p>;
        if (line === "") return <div key={i} className="h-1" />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} className="leading-relaxed">
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part,
            )}
          </p>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-48 gap-4 text-center py-8">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
        <Bot className="size-7 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">brAIn — Assistente PKM</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Pergunte sobre suas notas, peça para processar ideias ou criar conexões entre conceitos.
        </p>
      </div>
    </div>
  );
}
