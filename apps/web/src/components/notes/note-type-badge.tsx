import { cn } from "@my-better-t-app/ui/lib/utils";
import type { NoteType } from "@/types/brain";

const typeConfig: Record<
  NoteType,
  { label: string; colorClass: string; dotClass: string }
> = {
  fleeting: {
    label: "Fleeting",
    colorClass:
      "text-note-fleeting bg-note-fleeting/10 border-note-fleeting/25",
    dotClass: "bg-note-fleeting",
  },
  literature: {
    label: "Literature",
    colorClass:
      "text-note-literature bg-note-literature/10 border-note-literature/25",
    dotClass: "bg-note-literature",
  },
  permanent: {
    label: "Permanent",
    colorClass:
      "text-note-permanent bg-note-permanent/10 border-note-permanent/25",
    dotClass: "bg-note-permanent",
  },
};

interface NoteTypeBadgeProps {
  type: NoteType;
  showLabel?: boolean;
  className?: string;
}

export function NoteTypeBadge({
  type,
  showLabel = true,
  className,
}: NoteTypeBadgeProps) {
  const config = typeConfig[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border",
        "text-[10px] font-medium",
        config.colorClass,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClass)} />
      {showLabel && config.label}
    </span>
  );
}

export function NoteTypeStripe({ type }: { type: NoteType }) {
  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl",
        type === "fleeting" && "bg-note-fleeting",
        type === "literature" && "bg-note-literature",
        type === "permanent" && "bg-note-permanent",
      )}
    />
  );
}
