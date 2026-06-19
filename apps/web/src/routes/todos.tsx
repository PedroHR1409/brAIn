import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckSquare, Plus, Trash2, ChevronRight, ChevronDown,
  Calendar, Flag, X, Circle, CheckCircle2, AlignLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@my-better-t-app/ui/components/button";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { api, type ApiTask } from "@/lib/api";

export const Route = createFileRoute("/todos")({
  component: TodosPage,
});

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY = {
  1: { label: "Low",    color: "text-sky-400",   dot: "bg-sky-400"   },
  2: { label: "Medium", color: "text-yellow-400", dot: "bg-yellow-400" },
  3: { label: "High",   color: "text-orange-400", dot: "bg-orange-400" },
  4: { label: "Urgent", color: "text-red-400",    dot: "bg-red-400"   },
} as const;

type Filter = "all" | "today" | "completed";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Inline Add Task form ─────────────────────────────────────────────────────

function AddTaskRow({
  parentId,
  onAdd,
  placeholder = "Task name…",
  compact = false,
}: {
  parentId?: string;
  onAdd: (task: ApiTask) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(2);
  const [dueDate, setDueDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!title.trim()) { setActive(false); return; }
    try {
      const task = await api.tasks.create({
        title: title.trim(),
        parentId,
        priority,
        dueDate: dueDate || undefined,
      });
      onAdd(task);
      setTitle("");
      setDueDate("");
      setPriority(2);
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to create task.");
    }
  }

  if (!active && !compact) {
    return (
      <button
        onClick={() => { setActive(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors group"
      >
        <Plus className="size-3.5 text-primary opacity-70 group-hover:opacity-100" />
        Add task
      </button>
    );
  }

  if (!active && compact) {
    return (
      <button
        onClick={() => { setActive(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-1"
      >
        <Plus className="size-3" />
        Add subtask
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/40 bg-card shadow-sm overflow-hidden">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setActive(false); setTitle(""); }
        }}
        className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
        autoFocus
      />
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/20">
        {/* Priority */}
        <div className="flex items-center gap-1">
          {([1, 2, 3, 4] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                priority === p ? `${PRIORITY[p].color} bg-current/10` : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Flag className="size-2.5" />
              {PRIORITY[p].label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="ml-auto text-[10px] text-muted-foreground bg-transparent border-none outline-none"
        />
        <Button size="sm" className="h-6 px-2 text-[11px]" onClick={submit} disabled={!title.trim()}>
          Add
        </Button>
        <button onClick={() => { setActive(false); setTitle(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Subtask panel ────────────────────────────────────────────────────────────

function SubtasksPanel({ parentId, onSubtaskCreate }: { parentId: string; onSubtaskCreate?: () => void }) {
  const [subtasks, setSubtasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  async function load() {
    try {
      // Fetch all subtasks (pending + completed) so we can show/hide completed
      const { tasks } = await api.tasks.list({ parentId, completed: true });
      setSubtasks(tasks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleSubtask(task: ApiTask) {
    try {
      const updated = await api.tasks.update(task.id, { completed: !task.completed });
      setSubtasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      toast.error("Failed to update subtask.");
    }
  }

  async function deleteSubtask(id: string) {
    try {
      await api.tasks.delete(id);
      setSubtasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Failed to delete subtask.");
    }
  }

  if (loading) return <div className="py-2 text-[11px] text-muted-foreground">Loading…</div>;

  const completedCount = subtasks.filter((s) => s.completed).length;
  const visible = showCompleted
    ? subtasks
    : subtasks.filter((s) => !s.completed);

  return (
    <div className="space-y-1">
      {visible.map((sub) => (
        <div key={sub.id} className="group flex items-center gap-2 py-1">
          <button onClick={() => toggleSubtask(sub)} className="shrink-0">
            {sub.completed
              ? <CheckCircle2 className="size-3.5 text-note-permanent" />
              : <Circle className="size-3.5 text-muted-foreground hover:text-note-permanent transition-colors" />
            }
          </button>
          <span className={cn("flex-1 text-xs", sub.completed && "line-through text-muted-foreground")}>
            {sub.title}
          </span>
          <button
            onClick={() => deleteSubtask(sub.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      {completedCount > 0 && (
        <button
          onClick={() => setShowCompleted((v) => !v)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
        >
          {showCompleted ? `Hide ${completedCount} completed` : `Show ${completedCount} completed`}
        </button>
      )}
      <AddTaskRow
        parentId={parentId}
        onAdd={(task) => { setSubtasks((prev) => [...prev, task]); onSubtaskCreate?.(); }}
        placeholder="Subtask name…"
        compact
      />
    </div>
  );
}

// ─── Task detail panel ────────────────────────────────────────────────────────

function TaskDetail({
  task,
  onUpdate,
  onDelete,
  onClose,
}: {
  task: ApiTask;
  onUpdate: (updated: ApiTask) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subtaskCount, setSubtaskCount] = useState(0);

  async function save(fields: Partial<ApiTask>) {
    try {
      const updated = await api.tasks.update(task.id, fields as Parameters<typeof api.tasks.update>[1]);
      onUpdate(updated);
    } catch {
      toast.error("Failed to save.");
    }
  }

  function scheduleSave(fields: Partial<ApiTask>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(fields), 600);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <CheckSquare className="size-4 text-primary shrink-0" />
        <span className="text-sm font-semibold flex-1 text-foreground">Task detail</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          className="w-full bg-transparent text-base font-semibold text-foreground outline-none border-b border-transparent focus:border-primary/30 pb-1 transition-colors"
          placeholder="Task title…"
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <AlignLeft className="size-3" />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              scheduleSave({ description: e.target.value });
            }}
            placeholder="Add notes, details, links…"
            className="w-full min-h-20 resize-none rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Priority + Due date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Flag className="size-3" />
              Priority
            </label>
            <div className="flex flex-col gap-1">
              {([1, 2, 3, 4] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPriority(p); save({ priority: p }); }}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                    priority === p
                      ? `${PRIORITY[p].color} bg-current/10 font-medium`
                      : "text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  <span className={cn("size-2 rounded-full shrink-0", PRIORITY[p].dot)} />
                  {PRIORITY[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Calendar className="size-3" />
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                save({ dueDate: e.target.value || null });
              }}
              className="w-full rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/40 transition-colors"
            />
            {dueDate && (
              <button
                onClick={() => { setDueDate(""); save({ dueDate: null }); }}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear date
              </button>
            )}
          </div>
        </div>

        {/* Subtasks */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <CheckSquare className="size-3" />
            Subtasks
            {subtaskCount > 0 && (
              <span className="text-[10px] text-primary">({subtaskCount})</span>
            )}
          </label>
          <SubtasksPanel
            parentId={task.id}
            onSubtaskCreate={() => setSubtaskCount((c) => c + 1)}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <button
          onClick={() => {
            if (confirm("Delete this task and all its subtasks?")) {
              api.tasks.delete(task.id).then(() => onDelete(task.id)).catch(() => toast.error("Delete failed."));
            }
          }}
          className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
        >
          <Trash2 className="size-3.5" />
          Delete task
        </button>
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onSelect,
  selected,
}: {
  task: ApiTask;
  onToggle: (task: ApiTask) => void;
  onSelect: (task: ApiTask) => void;
  selected: boolean;
}) {
  const p = PRIORITY[task.priority as keyof typeof PRIORITY] ?? PRIORITY[2];
  const isOverdue = task.dueDate && task.dueDate < todayISO() && !task.completed;
  const isToday   = task.dueDate === todayISO();

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer",
        selected ? "bg-primary/8 border border-primary/20" : "hover:bg-accent/40",
      )}
      onClick={() => onSelect(task)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task); }}
        className="shrink-0"
      >
        {task.completed
          ? <CheckCircle2 className="size-4 text-note-permanent" />
          : <Circle className={cn("size-4 hover:text-note-permanent transition-colors", p.color.replace("text-", "text-"))} />
        }
      </button>

      {/* Priority dot */}
      <span className={cn("size-1.5 rounded-full shrink-0", p.dot)} />

      {/* Title */}
      <span className={cn(
        "flex-1 text-sm leading-snug",
        task.completed ? "line-through text-muted-foreground" : "text-foreground",
      )}>
        {task.title}
      </span>

      {/* Due date badge */}
      {task.dueDate && (
        <span className={cn(
          "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded",
          isOverdue ? "bg-red-500/15 text-red-400" :
          isToday   ? "bg-primary/15 text-primary" :
          "text-muted-foreground",
        )}>
          {isToday ? "Today" : task.dueDate}
        </span>
      )}

      <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TodosPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<ApiTask | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  async function load() {
    try {
      // completed: true = no server filter = all tasks; client-side display filter handles views
      const { tasks: rows } = await api.tasks.list({ completed: true });
      setTasks(rows);
    } catch {
      toast.error("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleTask(task: ApiTask) {
    try {
      const updated = await api.tasks.update(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      if (selected?.id === task.id) setSelected(updated);
    } catch {
      toast.error("Failed to update task.");
    }
  }

  function handleUpdate(updated: ApiTask) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelected(updated);
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelected(null);
  }

  const today = todayISO();
  const displayed = tasks.filter((t) => {
    if (filter === "today")     return t.dueDate === today && !t.completed;
    if (filter === "completed") return t.completed;
    return showCompleted ? true : !t.completed;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const todayCount   = tasks.filter((t) => t.dueDate === today && !t.completed).length;

  const FILTERS: { value: Filter; label: string; count?: number }[] = [
    { value: "all",       label: "All",       count: pendingCount },
    { value: "today",     label: "Today",     count: todayCount   },
    { value: "completed", label: "Completed"                       },
  ];

  return (
    <div className="flex h-full">
      {/* ── Main panel ── */}
      <div className={cn("flex flex-col flex-1 min-w-0 overflow-hidden", selected ? "border-r border-border" : "")}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <CheckSquare className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground">Todos</h1>
            <p className="text-[11px] text-muted-foreground">{pendingCount} pending task{pendingCount !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border">
          {FILTERS.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  filter === value ? "bg-white/20" : "bg-primary/15 text-primary",
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle2 className="size-10 text-note-permanent/40" />
              <p className="text-sm font-medium text-foreground">
                {filter === "today" ? "Nothing due today!" :
                 filter === "completed" ? "No completed tasks yet." :
                 "All clear — no pending tasks!"}
              </p>
              {filter === "all" && (
                <p className="text-xs text-muted-foreground">Add a task below to get started.</p>
              )}
            </div>
          ) : (
            displayed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onSelect={(t) => setSelected((s) => s?.id === t.id ? null : t)}
                selected={selected?.id === task.id}
              />
            ))
          )}

          {/* Add task */}
          {filter !== "completed" && (
            <div className="pt-2">
              <AddTaskRow
                onAdd={(task) => {
                  setTasks((prev) => [task, ...prev]);
                }}
              />
            </div>
          )}

          {/* Show/hide completed */}
          {filter === "all" && tasks.some((t) => t.completed) && (
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1.5 mt-4 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCompleted ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              {showCompleted ? "Hide" : "Show"} completed
            </button>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="w-80 shrink-0 hidden lg:flex flex-col overflow-hidden bg-card">
          <TaskDetail
            key={selected.id}
            task={selected}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  );
}
