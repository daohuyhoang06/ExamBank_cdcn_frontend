import type { ReactNode } from "react";
import { AppShell } from "@/layouts/shared/AppShell";
import { moderatorSidebarItems } from "./moderatorSidebar.config";

type Props = {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
};

export function ModeratorLayout({
  children,
  headerTitle,
  headerSubtitle,
}: Props) {
  return (
    <AppShell
      headerTitle={headerTitle}
      headerSubtitle={headerSubtitle}
      sidebarItems={moderatorSidebarItems}
      sidebarSubtitle="Moderator Suite"
    >
      {children}
    </AppShell>
  );
}
