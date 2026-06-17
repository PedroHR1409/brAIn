import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { CaptureFab } from "@/components/capture/capture-fab";
import { CommandPalette } from "@/components/search/command-palette";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <CaptureFab />
      <CommandPalette />
    </div>
  );
}
