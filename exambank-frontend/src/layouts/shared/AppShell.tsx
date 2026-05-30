import type { ReactNode } from "react";
import { AppSidebar, type SidebarNavItem } from "./AppSidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";

type Props = {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  sidebarItems: SidebarNavItem[];
  sidebarSubtitle: string;
};

export function AppShell({
  children,
  sidebarItems,
  sidebarSubtitle,
}: Props) {
  return (
    <SidebarProvider>
      {/* Layered Surface - Base Layer với outer padding 16px */}
      <div className="h-screen overflow-hidden bg-[var(--bg-page)] p-4">
        <div className="flex h-full gap-4">
          {/* Sidebar Layer */}
          <AppSidebar
            items={sidebarItems}
            subtitle={sidebarSubtitle}
          />

          {/* Main Content Layer - Khối trắng nổi trên Base Layer */}
          <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-[#f8fbff] to-blue-50/60 shadow-[0_28px_64px_-28px_rgba(15,76,147,0.42),0_18px_30px_-20px_rgba(16,21,38,0.26)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/92 via-white/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
            <div className="pointer-events-none absolute inset-x-8 -top-28 h-52 rounded-[999px] bg-[#dbeafe]/40 blur-[86px]" />
            <div className="pointer-events-none absolute -left-24 -top-24 h-[18rem] w-[18rem] rounded-full bg-[#A7F3D0]/58 blur-[110px]" />
            <div className="pointer-events-none absolute left-1/2 -top-32 h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-[#E9D5FF]/62 blur-[112px]" />
            <div className="pointer-events-none absolute -right-24 -top-24 h-[19rem] w-[19rem] rounded-full bg-[#bfdbfe]/52 blur-[108px]" />
            <div className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full bg-white/45 blur-2xl" />

            <main className="relative z-10 flex-1 overflow-y-auto p-5 lg:p-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
