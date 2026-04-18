import type { ReactNode } from "react";
import { AppSidebar, type SidebarNavItem } from "./AppSidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";

type Props = {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  sidebarItems: SidebarNavItem[];
  sidebarSubtitle: string;
  showAdminExtras?: boolean;
};

export function AppShell({
  children,
  sidebarItems,
  sidebarSubtitle,
  showAdminExtras = false,
}: Props) {
  return (
    <SidebarProvider>
      <div className="h-screen overflow-hidden bg-[var(--bg-page)]">
        <div className="flex h-full">
          <AppSidebar
            items={sidebarItems}
            subtitle={sidebarSubtitle}
            showAdminExtras={showAdminExtras}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 overflow-y-auto p-5 lg:p-6">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
