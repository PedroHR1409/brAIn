import { useState } from "react";
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
import type { NoteType, SourceType } from "@/types/brain";

export function QuickCaptureModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("fleeting");
  const [sourceType, setSourceType] = useState<SourceType>("other");
  const [tags, setTags] = useState("");

  const { create, loading } = useCreateNote();

  function reset() {
    setTitle("");
    setContent("");
    setTags("");
    setType("fleeting");
  }

  async function handleSave() {
    try {
      await create({
        title,
        content,
        type,
        sourceType: type === "literature" ? sourceType : undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Nota salva!");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar nota");
    }
  }

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Captura rápida
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="note-title">Ideia central (uma frase) *</Label>
              <Input
                id="note-title"
                placeholder="O que está na sua cabeça?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="note-content">Detalhes (opcional)</Label>
              <Textarea
                id="note-content"
                placeholder="Expanda o pensamento..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-24 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <NativeSelect
                  value={type}
                  onChange={(e) => setType(e.target.value as NoteType)}
                >
                  <NativeSelectOption value="fleeting">Fleeting Note</NativeSelectOption>
                  <NativeSelectOption value="literature">Literature Note</NativeSelectOption>
                  <NativeSelectOption value="permanent">Permanent Note</NativeSelectOption>
                </NativeSelect>
              </div>

              {type === "literature" && (
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
              Será salva como{" "}
              <span className="text-note-fleeting font-medium">Fleeting Note</span>{" "}
              — processe em até 48h.
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
