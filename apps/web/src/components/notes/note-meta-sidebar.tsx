import {
  Calendar,
  Zap,
  BarChart2,
  Inbox,
  CheckCircle,
  Archive,
  Pause,
  Trash2,
  ArrowUpCircle,
  Briefcase,
  Globe,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@my-better-t-app/ui/components/native-select";
import { NoteTypeBadge } from "@/components/notes/note-type-badge";
import { ConnectionsPanel } from "@/components/notes/connections-panel";
import type { ApiNote, CreateNoteBody } from "@/lib/api";
import type { NoteConnection } from "@/hooks/use-connections";

interface NoteMetaSidebarProps {
  note: ApiNote;
  saving: boolean;
  processing: boolean;
  connections: NoteConnection[];
  connectionsLoading: boolean;
  onUpdate: (patch: Partial<CreateNoteBody>) => void;
  onProcess: (type: "literature" | "permanent") => Promise<ApiNote | undefined>;
  onArchive: () => void;
  onDelete: () => void;
  onRemoveConnection: (id: string) => void;
  onAddConnection: (toNoteId: string) => Promise<void>;
}

const statusLabel: Record<string, { icon: React.ReactNode; label: string }> = {
  inbox: { icon: <Inbox className="size-3" />, label: "Inbox" },
  active: { icon: <CheckCircle className="size-3" />, label: "Ativa" },
  on_hold: { icon: <Pause className="size-3" />, label: "Em espera" },
  done: { icon: <CheckCircle className="size-3" />, label: "Concluída" },
  archived: { icon: <Archive className="size-3" />, label: "Arquivada" },
};

const PARA_OPTIONS = [
  { value: "", label: "Nenhuma" },
  { value: "project", label: "Projeto", icon: Briefcase },
  { value: "area", label: "Área", icon: Globe },
  { value: "resource", label: "Recurso", icon: BookOpen },
  { value: "archive", label: "Archive", icon: Archive },
] as const;

export function NoteMetaSidebar({
  note,
  saving,
  processing,
  connections,
  connectionsLoading,
  onUpdate,
  onProcess,
  onArchive,
  onDelete,
  onRemoveConnection,
  onAddConnection,
}: NoteMetaSidebarProps) {
  const status = statusLabel[note.status] ?? statusLabel.inbox;

  async function handlePromote(type: "literature" | "permanent") {
    try {
      await onProcess(type);
      toast.success(
        type === "permanent"
          ? "Promovida para Permanent Note!"
          : "Promovida para Literature Note!",
      );
    } catch {
      toast.error("Erro ao processar nota.");
    }
  }

  return (
    <aside className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 h-fit sticky top-6">
      {/* Type & Status */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <NoteTypeBadge type={note.type} />
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {status.icon}
            {status.label}
          </div>
        </div>
      </div>

      <Separator />

      {/* PARA category */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] text-muted-foreground font-medium">Categoria PARA</p>
        <NativeSelect
          value={note.para ?? ""}
          onChange={(e) => onUpdate({ para: e.target.value || undefined })}
          className="text-xs"
        >
          {PARA_OPTIONS.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <Separator />

      {/* Strength */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BarChart2 className="size-3" />
          Força da nota
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${note.strength}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-7 text-right">
            {note.strength}%
          </span>
        </div>
      </div>

      {/* Dates */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="size-3" />
          Datas
        </div>
        <div className="space-y-1 text-[10px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Criada</span>
            <span className="font-mono">{formatDate(note.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Atualizada</span>
            <span className="font-mono">{formatDate(note.updatedAt)}</span>
          </div>
          {note.processedAt && (
            <div className="flex justify-between">
              <span>Processada</span>
              <span className="font-mono">{formatDate(note.processedAt)}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Connections */}
      <ConnectionsPanel
        noteId={note.id}
        connections={connections}
        loading={connectionsLoading}
        onRemove={onRemoveConnection}
        onAdd={onAddConnection}
      />

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {note.type === "fleeting" && (
          <>
            <Button
              size="sm"
              className="w-full gap-2 justify-start"
              onClick={() => handlePromote("literature")}
              disabled={processing}
            >
              <ArrowUpCircle className="size-3.5" />
              Promover para Literature
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 justify-start text-note-permanent border-note-permanent/30 hover:bg-note-permanent/10"
              onClick={() => handlePromote("permanent")}
              disabled={processing}
            >
              <Zap className="size-3.5" />
              Promover para Permanent
            </Button>
          </>
        )}

        {note.type === "literature" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 justify-start text-note-permanent border-note-permanent/30 hover:bg-note-permanent/10"
            onClick={() => handlePromote("permanent")}
            disabled={processing}
          >
            <Zap className="size-3.5" />
            Promover para Permanent
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="w-full gap-2 justify-start text-muted-foreground"
          onClick={onArchive}
          disabled={processing}
        >
          <Archive className="size-3.5" />
          Arquivar
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="w-full gap-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          disabled={processing}
        >
          <Trash2 className="size-3.5" />
          Excluir nota
        </Button>
      </div>

      {saving && (
        <p className="text-[10px] text-muted-foreground text-center animate-pulse">
          Salvando…
        </p>
      )}
    </aside>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
