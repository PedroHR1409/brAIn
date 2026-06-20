import { useEffect, useState } from "react";
import { Target, Plus, Check, Sparkles, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { api, type ApiHabit } from "@/lib/api";

const COLORS = [
  "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#F97316",
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return days;
}

const EMPTY_SET = new Set<string>();

export function HabitTracker() {
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [logsMap, setLogsMap] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const today = todayISO();
  const days14 = getLast14Days();

  async function load() {
    try {
      const data = await api.habits.list(today);
      setHabits(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
    try {
      const { logs } = await api.habits.logs(30);
      const map = new Map<string, Set<string>>();
      for (const log of logs) {
        if (!map.has(log.habitId)) map.set(log.habitId, new Set());
        map.get(log.habitId)!.add(log.date);
      }
      setLogsMap(map);
    } catch {
      // logs endpoint unavailable, grid shows empty
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleHabit(habit: ApiHabit) {
    const optimistic = habits.map((h) =>
      h.id === habit.id ? { ...h, completedToday: !h.completedToday, logSource: "manual" as const } : h,
    );
    setHabits(optimistic);
    try {
      await api.habits.log(habit.id, { date: today, toggle: true });
    } catch {
      setHabits(habits);
      toast.error("Failed to log habit.");
    }
  }

  async function addHabit() {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const keywords = newKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      const created = await api.habits.create({ name: newName.trim(), keywords, color: newColor });
      setHabits((prev) => [...prev, created]);
      setNewName("");
      setNewKeywords("");
      setNewColor(COLORS[0]);
      setShowAdd(false);
    } catch {
      toast.error("Failed to create habit.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    try {
      await api.habits.delete(id);
    } catch {
      load();
      toast.error("Failed to delete habit.");
    }
  }

  async function runAiDetect() {
    setAiRunning(true);
    try {
      const result = await api.habits.aiDetect(today);
      if (result.detected.length > 0) {
        await load();
        toast.success(`AI detected ${result.detected.length} habit${result.detected.length > 1 ? "s" : ""} from your notes!`);
      } else {
        toast.info("No habits detected in today's notes.");
      }
    } catch {
      toast.error("AI detection failed.");
    } finally {
      setAiRunning(false);
    }
  }

  const done = habits.filter((h) => h.completedToday).length;
  const total = habits.length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <Target className="size-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">Habits</span>
        {total > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {done}/{total}
          </span>
        )}
        {expanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {/* Progress bar */}
          {total > 0 && (
            <div className="h-1 rounded-full bg-muted overflow-hidden mx-1 mb-2">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
              />
            </div>
          )}

          {loading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
          ) : habits.length === 0 && !showAdd ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No habits yet. Add one below.
            </p>
          ) : (
            habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                today={today}
                completedDates={logsMap.get(habit.id) ?? EMPTY_SET}
                days={days14}
                onToggle={() => toggleHabit(habit)}
                onDelete={() => deleteHabit(habit.id)}
              />
            ))
          )}

          {/* Add form */}
          {showAdd ? (
            <div className="border border-border rounded-lg p-3 space-y-2 mt-2">
              <Input
                placeholder="Habit name (e.g. Read a book)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") setShowAdd(false); }}
              />
              <Input
                placeholder="Keywords for AI (e.g. book, reading, chapter)"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                className="h-7 text-xs"
              />
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn("size-5 rounded-full transition-transform", newColor === c && "ring-2 ring-offset-1 ring-primary scale-110")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" className="h-6 text-xs flex-1" onClick={addHabit} disabled={saving || !newName.trim()}>
                  {saving ? "Saving…" : "Add"}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setShowAdd(false)}>
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground flex-1"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="size-3" />
                Add habit
              </Button>
              {habits.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-primary"
                  onClick={runAiDetect}
                  disabled={aiRunning}
                >
                  <Sparkles className={cn("size-3", aiRunning && "animate-pulse")} />
                  AI
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HabitRow({
  habit,
  today,
  days,
  completedDates,
  onToggle,
  onDelete,
}: {
  habit: ApiHabit;
  today: string;
  days: string[];
  completedDates: Set<string>;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-lg px-1.5 py-1.5 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={cn(
            "size-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
            habit.completedToday
              ? "border-transparent"
              : "border-muted-foreground/30 hover:border-primary/60",
          )}
          style={habit.completedToday ? { backgroundColor: habit.color } : undefined}
        >
          {habit.completedToday && <Check className="size-3 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate transition-colors",
              habit.completedToday ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {habit.name}
          </p>
          {habit.completedToday && habit.logSource === "ai" && (
            <p className="text-[9px] text-primary flex items-center gap-0.5">
              <Sparkles className="size-2" />
              AI detected
            </p>
          )}
        </div>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      {/* 30-day history grid — oldest left, today right */}
      <div style={{ display: "flex", gap: "2px", marginTop: "6px" }}>
        {days.map((dateStr) => {
          const isToday = dateStr === today;
          const completed = isToday ? habit.completedToday : completedDates.has(dateStr);
          const [, m, d] = dateStr.split("-");
          return (
            <div
              key={dateStr}
              title={`${d}/${m}`}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                flexShrink: 0,
                backgroundColor: completed ? habit.color : "var(--border)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
