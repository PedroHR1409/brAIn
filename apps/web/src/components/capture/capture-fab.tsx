import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { useCreateNote } from "@/hooks/use-notes";
import { brainEvents } from "@/lib/events";

export function CaptureFab() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { create, loading } = useCreateNote();

  useEffect(() => brainEvents.on("open-capture", () => setOpen(true)), []);

  async function handleSave() {
    try {
      await create({ title, content, type: "fleeting" });
      toast.success("Nota salva!");
      setOpen(false);
      setTitle("");
      setContent("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar nota");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_color-mix(in_oklch,var(--color-primary)_35%,transparent)] transition-all hover:scale-105 hover:shadow-[0_8px_30px_color-mix(in_oklch,var(--color-primary)_45%,transparent)] active:scale-95"
        aria-label="Captura rápida"
      >
        <Plus className="size-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Captura rápida</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fab-title">Ideia central *</Label>
              <Input
                id="fab-title"
                placeholder="O que está na sua cabeça?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fab-content">Detalhes</Label>
              <Textarea
                id="fab-content"
                placeholder="Expanda o pensamento..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || loading}>
              {loading ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
