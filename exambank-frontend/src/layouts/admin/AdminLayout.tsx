import type { ReactNode } from "react";
import { AppShell } from "@/layouts/shared/AppShell";
import { adminSidebarItems } from "./adminSidebar.config";

type Props = {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
};

export function AdminLayout({
  children,
  headerTitle,
  headerSubtitle,
}: Props) {
  return (
    <AppShell
      headerTitle={headerTitle}
      headerSubtitle={headerSubtitle}
      sidebarItems={adminSidebarItems}
      sidebarSubtitle="Admin Control Panel"
    >
      {children}
    </AppShell>
  );
}
