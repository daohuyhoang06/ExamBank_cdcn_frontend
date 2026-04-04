import { FileText, Gauge, UserCog } from "lucide-react";
import type { SidebarNavItem } from "@/layouts/shared/AppSidebar";

export const studentSidebarItems: SidebarNavItem[] = [
  { label: "Danh sách đề", path: "/user/exambank", icon: FileText },
  { label: "Hồ sơ", path: "/user/profile", icon: UserCog },
  { label: "Xếp hạng", path: "/user/ranking", icon: Gauge },
];
