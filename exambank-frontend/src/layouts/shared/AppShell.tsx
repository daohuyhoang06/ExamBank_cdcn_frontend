import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar, type SidebarNavItem } from "./AppSidebar";

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
  headerTitle,
  headerSubtitle,
  sidebarItems,
  sidebarSubtitle,
  showAdminExtras = false,
}: Props) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="flex min-h-screen">
        <AppSidebar
          items={sidebarItems}
          subtitle={sidebarSubtitle}
          showAdminExtras={showAdminExtras}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader title={headerTitle} subtitle={headerSubtitle} />

          <main className="flex-1 p-5 lg:p-6">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
