import { cn } from "@my-better-t-app/ui/lib/utils";

interface TagBadgeProps {
  tag: string;
  className?: string;
  onClick?: () => void;
}

export function TagBadge({ tag, className, onClick }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md",
        "text-[10px] font-mono font-medium",
        "bg-primary/10 text-accent-foreground border border-primary/20",
        "transition-colors hover:bg-primary/20 select-none",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <span className="opacity-50">#</span>
      {tag}
    </span>
  );
}
