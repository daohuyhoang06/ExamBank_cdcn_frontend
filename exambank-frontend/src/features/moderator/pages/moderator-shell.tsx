import { Outlet } from "react-router-dom";
import { ModeratorLayout } from "@/layouts/moderator/ModeratorLayout";

const header = {
  title: "Moderator",
  subtitle: "Tài khoản",
};

export default function ModeratorShell() {
  return (
    <ModeratorLayout
      headerTitle={header.title}
      headerSubtitle={header.subtitle}
    >
      <Outlet />
    </ModeratorLayout>
  );
}
