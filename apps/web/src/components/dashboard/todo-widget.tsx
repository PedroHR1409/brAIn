import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckSquare, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { api, type ApiTodo } from "@/lib/api";

export function TodoWidget() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<ApiTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);

  async function load() {
    try {
      const { todos: data } = await api.todos.list();
      setTodos(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function checkTodo(todo: ApiTodo) {
    const key = `${todo.noteId}:${todo.lineIndex}`;
    setChecking(key);
    setTodos((prev) => prev.filter((t) => !(t.noteId === todo.noteId && t.lineIndex === todo.lineIndex)));
    try {
      await api.todos.toggle(todo.noteId, todo.lineIndex, true);
    } catch {
      load(); // refetch on error
    } finally {
      setChecking(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <CheckSquare className="size-4 text-note-permanent shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">Pending Todos</span>
        {todos.length > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
            {todos.length}
          </span>
        )}
        {expanded ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1">
          {loading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
          ) : todos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              All done! No pending todos.
            </p>
          ) : (
            todos.map((todo) => {
              const key = `${todo.noteId}:${todo.lineIndex}`;
              return (
                <div key={key} className="group flex items-start gap-2 rounded-lg px-1.5 py-1.5 hover:bg-accent/30 transition-colors">
                  <button
                    onClick={() => checkTodo(todo)}
                    disabled={checking === key}
                    className="mt-0.5 size-3.5 shrink-0 rounded border border-muted-foreground/30 hover:border-note-permanent hover:bg-note-permanent/10 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug line-clamp-2">{todo.text}</p>
                    <p className="text-[9px] text-muted-foreground truncate mt-0.5">{todo.noteTitle}</p>
                  </div>
                  <button
                    onClick={() => navigate({ to: "/notes/$id", params: { id: todo.noteId } })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground mt-0.5"
                  >
                    <ExternalLink className="size-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
