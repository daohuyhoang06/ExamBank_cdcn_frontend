import type { ReactNode } from "react";
import { AppShell } from "@/layouts/shared/AppShell";
import { studentSidebarItems } from "./studentSidebar.config";

type Props = {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
};

export function StudentLayout({
  children,
  headerTitle,
  headerSubtitle,
}: Props) {
  return (
    <AppShell
      headerTitle={headerTitle}
      headerSubtitle={headerSubtitle}
      sidebarItems={studentSidebarItems}
      sidebarSubtitle="Student Dashboard"
    >
      {children}
    </AppShell>
  );
}
