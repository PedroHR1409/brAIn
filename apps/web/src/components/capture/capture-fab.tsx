import { Plus } from "lucide-react";
import { brainEvents } from "@/lib/events";

export function CaptureFab() {
  return (
    <button
      onClick={() => brainEvents.emit("open-capture")}
      className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_color-mix(in_oklch,var(--color-primary)_35%,transparent)] transition-all hover:scale-105 hover:shadow-[0_8px_30px_color-mix(in_oklch,var(--color-primary)_45%,transparent)] active:scale-95"
      aria-label="Captura rápida"
    >
      <Plus className="size-6" />
    </button>
  );
}
