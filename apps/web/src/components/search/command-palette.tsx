import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  FileText,
  Inbox,
  Network,
  Plus,
  Zap,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@my-better-t-app/ui/components/command";
import { NoteTypeBadge } from "@/components/notes/note-type-badge";
import { brainEvents } from "@/lib/events";
import { api, type ApiNote } from "@/lib/api";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiNote[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Simple in-memory cache: query → results (survives re-renders, cleared on close)
  const cache = useRef<Map<string, ApiNote[]>>(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => brainEvents.on("open-palette", () => setOpen(true)), []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      cache.current.clear();
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }

    // Show cached result immediately if available
    const cached = cache.current.get(q);
    if (cached) setResults(cached);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.notes.list({ q, limit: 8 });
        cache.current.set(q, data);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, cached ? 400 : 200); // longer delay if we already have cached results

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query]);

  function runAndClose(fn: () => void) {
    setOpen(false);
    setTimeout(fn, 80);
  }

  function goTo(to: string) {
    setOpen(false);
    navigate({ to });
  }

  function goToNote(id: string) {
    setOpen(false);
    navigate({ to: "/notes/$id", params: { id } });
  }

  const showNav = query.trim().length < 2;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search & Actions"
      description="Search notes, navigate, or run quick actions."
      className="top-[20%] max-w-xl rounded-xl translate-y-0"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search notes, navigate, run action…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[400px]">
          {showNav && (
            <>
              <CommandGroup heading="Quick actions">
                <CommandItem onSelect={() => runAndClose(() => brainEvents.emit("open-capture"))}>
                  <Plus className="size-4 text-primary" />
                  <span>Quick Capture</span>
                  <CommandShortcut>
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">C</kbd>
                  </CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runAndClose(() => brainEvents.emit("open-capture"))}>
                  <Zap className="size-4 text-note-fleeting" />
                  <span>New Fleeting Note</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Navigate">
                <CommandItem onSelect={() => goTo("/")}>
                  <Activity className="size-4 text-muted-foreground" />
                  <span>Dashboard</span>
                  <CommandShortcut>
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">G D</kbd>
                  </CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => goTo("/inbox")}>
                  <Inbox className="size-4 text-note-literature" />
                  <span>Inbox</span>
                  <CommandShortcut>
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">G I</kbd>
                  </CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => goTo("/daily")}>
                  <CalendarDays className="size-4 text-note-permanent" />
                  <span>Daily Note</span>
                  <CommandShortcut>
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">G N</kbd>
                  </CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => goTo("/graph")}>
                  <Network className="size-4 text-primary" />
                  <span>Knowledge Graph</span>
                  <CommandShortcut>
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">G G</kbd>
                  </CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {query.trim().length >= 2 && (
            <>
              {searching && results.length === 0 ? (
                <CommandEmpty>Searching…</CommandEmpty>
              ) : results.length === 0 ? (
                <CommandEmpty>No notes found for &ldquo;{query}&rdquo;.</CommandEmpty>
              ) : (
                <CommandGroup heading={`Notes (${results.length})${searching ? " · updating…" : ""}`}>
                  {results.map((note) => (
                    <CommandItem
                      key={note.id}
                      value={note.id}
                      onSelect={() => goToNote(note.id)}
                      className="gap-3"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-xs">{note.title}</span>
                      <NoteTypeBadge type={note.type} showLabel={false} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>

        <div className="flex items-center gap-3 border-t border-border px-3 py-2">
          <span className="text-[10px] text-muted-foreground">
            <kbd className="bg-muted px-1 py-0.5 rounded text-[10px] mr-1">↑↓</kbd>
            navigate
          </span>
          <span className="text-[10px] text-muted-foreground">
            <kbd className="bg-muted px-1 py-0.5 rounded text-[10px] mr-1">↵</kbd>
            select
          </span>
          <span className="text-[10px] text-muted-foreground">
            <kbd className="bg-muted px-1 py-0.5 rounded text-[10px] mr-1">Esc</kbd>
            close
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">Ctrl K</kbd>
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
