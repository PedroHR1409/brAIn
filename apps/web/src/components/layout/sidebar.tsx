import { Link, useRouterState } from "@tanstack/react-router";
import {
  Brain,
  Inbox,
  CalendarDays,
  Network,
  Briefcase,
  Globe,
  BookOpen,
  Archive,
  Activity,
  Sparkles,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { ScrollArea } from "@my-better-t-app/ui/components/scroll-area";
import { QuickCaptureModal } from "@/components/capture/quick-capture-modal";
import { brainEvents } from "@/lib/events";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  exact?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: Activity, exact: true },
      { to: "/inbox", label: "Inbox", icon: Inbox, badge: "12" },
      { to: "/daily", label: "Daily Note", icon: CalendarDays },
      { to: "/graph", label: "Knowledge Graph", icon: Network },
    ],
  },
  {
    title: "PARA",
    items: [
      { to: "/inbox?para=project", label: "Projetos", icon: Briefcase },
      { to: "/inbox?para=area", label: "Áreas", icon: Globe },
      { to: "/inbox?para=resource", label: "Recursos", icon: BookOpen },
      { to: "/inbox?para=archive", label: "Archive", icon: Archive },
    ],
  },
  {
    title: "Vault",
    items: [
      { to: "/", label: "Saúde da Vault", icon: Activity, exact: true },
      { to: "/ai", label: "AI Studio", icon: Sparkles, exact: true },
    ],
  },
];

export function Sidebar() {
  const router = useRouterState();
  const pathname = router.location.pathname;

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.to;
    return pathname.startsWith(item.to);
  }

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <Brain className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground leading-none">
            Second Brain
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            PKM · PARA + Zettelkasten
          </p>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        <QuickCaptureModal />
        <button
          onClick={() => brainEvents.emit("open-palette")}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="hidden sm:inline-flex items-center rounded bg-background/60 px-1 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
            ⌃K
          </kbd>
        </button>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-4">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                          active
                            ? "bg-accent text-sidebar-primary shadow-[inset_3px_0_0_var(--color-sidebar-primary)] -ml-[3px] pl-[calc(0.625rem+3px)]"
                            : "text-sidebar-foreground/70 hover:bg-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            active
                              ? "text-sidebar-primary"
                              : "text-muted-foreground group-hover:text-sidebar-foreground",
                          )}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                        {!active && (
                          <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <Separator />
      <div className="p-3">
        <p className="text-center text-[10px] text-muted-foreground">
          brAIn v0.1 · by W1
        </p>
      </div>
    </aside>
  );
}
