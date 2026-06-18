import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
  Zap,
} from "lucide-react";
import { cn } from "@my-better-t-app/ui/lib/utils";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { ScrollArea } from "@my-better-t-app/ui/components/scroll-area";
import { QuickCaptureModal } from "@/components/capture/quick-capture-modal";
import { brainEvents } from "@/lib/events";
import { useInboxCount } from "@/hooks/use-notes";

type ParaCategory = "project" | "area" | "resource" | "archive";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface ParaItem {
  category: ParaCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Activity, exact: true },
  { to: "/inbox", label: "Inbox", icon: Inbox, exact: true },
  { to: "/daily", label: "Daily Note", icon: CalendarDays },
  { to: "/graph", label: "Knowledge Graph", icon: Network },
];

const PARA_NAV: ParaItem[] = [
  { category: "project", label: "Projects", icon: Briefcase },
  { category: "area", label: "Areas", icon: Globe },
  { category: "resource", label: "Resources", icon: BookOpen },
  { category: "archive", label: "Archive", icon: Archive },
];

const ZETTELKASTEN_NAV = [
  { type: "permanent" as const, label: "Permanent Notes", icon: Zap },
];

const VAULT_NAV: NavItem[] = [
  { to: "/", label: "Vault Health", icon: Activity, exact: true },
  { to: "/ai", label: "AI Studio", icon: Sparkles, exact: true },
];

export function Sidebar() {
  const router = useRouterState();
  const navigate = useNavigate();
  const pathname = router.location.pathname;
  const inboxCount = useInboxCount();

  const currentSearch = router.location.search as { para?: string; type?: string };
  const currentPara = currentSearch.para ?? null;
  const currentType = currentSearch.type ?? null;

  function isNavActive(item: NavItem) {
    if (item.exact) {
      if (item.to === "/inbox") return pathname === "/inbox" && !currentPara && !currentType;
      return pathname === item.to;
    }
    return pathname.startsWith(item.to);
  }

  function isZettelActive(type: string) {
    return pathname === "/inbox" && currentType === type;
  }

  function isParaActive(category: ParaCategory) {
    return pathname === "/inbox" && currentPara === category;
  }

  function renderNavItem(item: NavItem, active: boolean, badge?: React.ReactNode) {
    return (
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
            active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
          )}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {badge}
        {!active && (
          <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </Link>
    );
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
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden sm:inline-flex items-center rounded bg-background/60 px-1 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
            ⌃K
          </kbd>
        </button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-4">
          {/* Main nav */}
          <ul className="space-y-0.5">
            {MAIN_NAV.map((item) => {
              const active = isNavActive(item);
              const badge =
                item.to === "/inbox" && inboxCount !== null && inboxCount > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                    {inboxCount}
                  </span>
                ) : undefined;
              return <li key={item.to}>{renderNavItem(item, active, badge)}</li>;
            })}
          </ul>

          {/* PARA */}
          <div>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              PARA
            </p>
            <ul className="space-y-0.5">
              {PARA_NAV.map((item) => {
                const active = isParaActive(item.category);
                return (
                  <li key={item.category}>
                    <button
                      onClick={() =>
                        navigate({ to: "/inbox", search: { para: item.category } })
                      }
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                        active
                          ? "bg-accent text-sidebar-primary shadow-[inset_3px_0_0_var(--color-sidebar-primary)] -ml-[3px] pl-[calc(0.625rem+3px)]"
                          : "text-sidebar-foreground/70 hover:bg-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {!active && (
                        <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Zettelkasten */}
          <div>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Zettelkasten
            </p>
            <ul className="space-y-0.5">
              {ZETTELKASTEN_NAV.map((item) => {
                const active = isZettelActive(item.type);
                return (
                  <li key={item.type}>
                    <button
                      onClick={() => navigate({ to: "/inbox", search: { type: item.type } })}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                        active
                          ? "bg-accent text-sidebar-primary shadow-[inset_3px_0_0_var(--color-sidebar-primary)] -ml-[3px] pl-[calc(0.625rem+3px)]"
                          : "text-sidebar-foreground/70 hover:bg-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {!active && (
                        <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Vault */}
          <div>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Vault
            </p>
            <ul className="space-y-0.5">
              {VAULT_NAV.map((item) => {
                const active = isNavActive(item);
                return <li key={item.to + item.label}>{renderNavItem(item, active)}</li>;
              })}
            </ul>
          </div>
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-3">
        <p className="text-center text-[10px] text-muted-foreground">
          brAIn v0.1 · by W1
        </p>
      </div>
    </aside>
  );
}
