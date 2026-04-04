import { Outlet } from "react-router-dom";
import { AppShell } from "@/layouts/shared/AppShell";
import { studentSidebarItems } from "./studentSidebar.config";

export function StudentLayout() {
  console.log('StudentLayout rendering');
  return (
    <AppShell
      headerTitle="Dashboard"
      headerSubtitle="Welcome back"
      sidebarItems={studentSidebarItems}
      sidebarSubtitle="Student Dashboard"
    >
      <Outlet />
    </AppShell>
  );
}