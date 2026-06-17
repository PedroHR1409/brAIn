import { Activity, Brain, FileText, Link, AlertTriangle } from "lucide-react";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@my-better-t-app/ui/components/progress";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import type { ApiVaultStats } from "@/lib/api";

interface VaultHealthProps {
  stats?: ApiVaultStats | null;
  loading?: boolean;
}

export function VaultHealth({ stats, loading }: VaultHealthProps) {
  if (loading || !stats) {
    return <VaultHealthSkeleton />;
  }

  const total = stats.total || 1; // avoid /0
  const permanentPct = Math.round((stats.permanent / total) * 100);
  const literaturePct = Math.round((stats.literature / total) * 100);
  const fleetingPct = Math.round((stats.fleeting / total) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-card-foreground">
          Saúde da Vault
        </h2>
        <span className="ml-auto text-xs font-mono font-medium text-primary">
          {stats.healthScore}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Brain className="size-4 text-primary" />}
          value={stats.total}
          label="Total de notas"
        />
        <StatCard
          icon={<FileText className="size-4 text-note-permanent" />}
          value={stats.permanent}
          label="Permanent"
          color="text-note-permanent"
        />
        <StatCard
          icon={<Link className="size-4 text-note-literature" />}
          value={stats.connections}
          label="Conexões"
          color="text-note-literature"
        />
        <StatCard
          icon={<AlertTriangle className="size-4 text-note-fleeting" />}
          value={stats.pending}
          label="Pendentes"
          color="text-note-fleeting"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <ProgressRow
          label="Permanent Notes"
          value={permanentPct}
          colorClass="[&_[data-slot=progress-indicator]]:bg-note-permanent"
        />
        <ProgressRow
          label="Literature Notes"
          value={literaturePct}
          colorClass="[&_[data-slot=progress-indicator]]:bg-note-literature"
        />
        <ProgressRow
          label="Fleeting Notes"
          value={fleetingPct}
          colorClass="[&_[data-slot=progress-indicator]]:bg-note-fleeting"
        />
      </div>

      {stats.pending > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-note-fleeting/25 bg-note-fleeting/10 px-3 py-2">
          <AlertTriangle className="size-3.5 text-note-fleeting shrink-0" />
          <p className="text-[11px] text-note-fleeting">
            {stats.pending} nota{stats.pending > 1 ? "s" : ""} fugaz
            {stats.pending > 1 ? "es" : ""} deve{stats.pending > 1 ? "m" : ""} ser
            processada{stats.pending > 1 ? "s" : ""} em até 48h.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  color = "text-card-foreground",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/50 p-3">
      {icon}
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <Progress value={value} className={colorClass}>
      <ProgressLabel className="text-[11px] text-muted-foreground">{label}</ProgressLabel>
      <ProgressValue className="text-[11px]" />
    </Progress>
  );
}

function VaultHealthSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="ml-auto h-4 w-10 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full rounded" />
        ))}
      </div>
    </div>
  );
}
