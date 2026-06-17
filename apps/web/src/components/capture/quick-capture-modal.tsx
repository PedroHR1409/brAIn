import { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@my-better-t-app/ui/components/dialog";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@my-better-t-app/ui/components/native-select";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { useCreateNote } from "@/hooks/use-notes";
import { brainEvents } from "@/lib/events";
import type { NoteType, SourceType } from "@/types/brain";

type ParaCategory = "project" | "area" | "resource" | "archive" | "";

// ─── Templates ────────────────────────────────────────────────────────────────

const TYPE_TEMPLATES: Record<NoteType, string> = {
  fleeting: "",
  literature: "## Resumo\n\n\n## Citação relevante\n\n\n## Minha visão\n\n",
  permanent: "## Ideia principal\n\n\n## Evidência / Raciocínio\n\n\n## Conexões\n\n",
};

const TYPE_TITLE_PLACEHOLDER: Record<NoteType, string> = {
  fleeting: "O que está na sua cabeça?",
  literature: "Título do livro, artigo, podcast...",
  permanent: "Qual é a ideia central? (seja específico)",
};

const PARA_CONFIG: Record<string, { type: NoteType; content: string; titlePlaceholder: string }> = {
  project: {
    type: "permanent",
    content: "## Objetivo\n\n\n## Por que isso importa\n\n\n## Próximos passos\n- [ ] \n\n## Referências\n\n",
    titlePlaceholder: "Nome do projeto",
  },
  area: {
    type: "permanent",
    content: "## Descrição\n\n\n## Padrões e responsabilidades\n\n\n## Referências\n\n",
    titlePlaceholder: "Nome da área (ex: Saúde, Finanças, Trabalho)",
  },
  resource: {
    type: "literature",
    content: "## Sobre o recurso\n\n\n## Pontos principais\n\n\n## Aplicação prática\n\n",
    titlePlaceholder: "Nome do recurso ou tópico",
  },
};

const ALL_TEMPLATES = new Set(
  [
    ...Object.values(TYPE_TEMPLATES),
    ...Object.values(PARA_CONFIG).map((c) => c.content),
  ].filter(Boolean),
);

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickCaptureModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("fleeting");
  const [sourceType, setSourceType] = useState<SourceType>("other");
  const [para, setPara] = useState<ParaCategory>("");
  const [tags, setTags] = useState("");
  const prevType = useRef<NoteType>("fleeting");

  const { create, loading } = useCreateNote();

  useEffect(() =>
    brainEvents.on("open-capture", (detail?: unknown) => {
      const d = detail as { para?: string } | undefined;
      if (d?.para && d.para in PARA_CONFIG) {
        const cfg = PARA_CONFIG[d.para];
        setPara(d.para as ParaCategory);
        setType(cfg.type);
        setContent(cfg.content);
        prevType.current = cfg.type;
      }
      setOpen(true);
    }),
  []);

  function handleTypeChange(newType: NoteType) {
    setType(newType);
    prevType.current = newType;
    if (!content || ALL_TEMPLATES.has(content)) {
      setContent(TYPE_TEMPLATES[newType]);
    }
  }

  function reset() {
    setTitle("");
    setContent("");
    setTags("");
    setType("fleeting");
    setPara("");
    prevType.current = "fleeting";
  }

  async function handleSave() {
    if (!title.trim() || loading) return;
    try {
      // Permanent notes and PARA-categorized notes skip inbox — they're already processed
      const status = type === "permanent" || !!para ? "active" : undefined;
      await create({
        title,
        content,
        type,
        status,
        sourceType: type === "literature" ? sourceType : undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        para: para || undefined,
      });
      toast.success("Nota salva!");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar nota");
    }
  }

  const paraConfig = para && para in PARA_CONFIG ? PARA_CONFIG[para] : null;
  const titlePlaceholder = paraConfig?.titlePlaceholder ?? TYPE_TITLE_PLACEHOLDER[type];
  const modalTitle = paraConfig
    ? { project: "Novo projeto", area: "Nova área", resource: "Novo recurso" }[para as string] ?? "Captura rápida"
    : "Captura rápida";

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="w-full gap-2 rounded-lg"
        onClick={() => setOpen(true)}
      >
        <Zap className="size-3.5" />
        Captura rápida
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}
        // biome-ignore lint/a11y/useKeyWithClickEvents: handled via onKeyDown in content
      >
        <DialogContent
          className="sm:max-w-lg"
          showCloseButton
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{modalTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="note-title">
                {para === "project" ? "Nome do projeto *" :
                 para === "area" ? "Nome da área *" :
                 para === "resource" ? "Nome do recurso *" :
                 "Ideia central (uma frase) *"}
              </Label>
              <Input
                id="note-title"
                placeholder={titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="note-content">
                {para ? "Detalhes" : "Detalhes (opcional)"}
              </Label>
              <Textarea
                id="note-content"
                placeholder={para ? "" : "Expanda o pensamento..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32 resize-none font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <NativeSelect
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as NoteType)}
                >
                  <NativeSelectOption value="fleeting">Fleeting Note</NativeSelectOption>
                  <NativeSelectOption value="literature">Literature Note</NativeSelectOption>
                  <NativeSelectOption value="permanent">Permanent Note</NativeSelectOption>
                </NativeSelect>
              </div>

              {type === "literature" ? (
                <div className="grid gap-1.5">
                  <Label>Fonte</Label>
                  <NativeSelect
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                  >
                    <NativeSelectOption value="article">Artigo</NativeSelectOption>
                    <NativeSelectOption value="book">Livro</NativeSelectOption>
                    <NativeSelectOption value="podcast">Podcast</NativeSelectOption>
                    <NativeSelectOption value="other">Outro</NativeSelectOption>
                  </NativeSelect>
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label>Categoria (PARA)</Label>
                  <NativeSelect
                    value={para}
                    onChange={(e) => setPara(e.target.value as ParaCategory)}
                  >
                    <NativeSelectOption value="">Nenhuma</NativeSelectOption>
                    <NativeSelectOption value="project">Projeto</NativeSelectOption>
                    <NativeSelectOption value="area">Área</NativeSelectOption>
                    <NativeSelectOption value="resource">Recurso</NativeSelectOption>
                    <NativeSelectOption value="archive">Archive</NativeSelectOption>
                  </NativeSelect>
                </div>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="note-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="note-tags"
                placeholder="pkm, zettelkasten, produtividade"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <p className="text-[10px] text-muted-foreground">
              {type === "fleeting" && (
                <>Será salva como <span className="text-note-fleeting font-medium">Fleeting Note</span> — processe em até 48h.</>
              )}
              {type === "literature" && (
                <>Será salva como <span className="text-note-literature font-medium">Literature Note</span> — registre a fonte acima.</>
              )}
              {type === "permanent" && (
                <>Será salva como <span className="font-medium">Permanent Note</span> — definitiva e processada.</>
              )}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || loading}>
              {loading ? "Salvando…" : "Salvar nota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
