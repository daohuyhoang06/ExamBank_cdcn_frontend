import { FileText, Gauge, UserCog } from "lucide-react";
import type { SidebarNavItem } from "@/layouts/shared/AppSidebar";

export const studentSidebarItems: SidebarNavItem[] = [
  { label: "Danh sách đề", path: "/exams", icon: FileText },
  { label: "Hồ sơ", path: "/profile", icon: UserCog },
  { label: "Xếp hạng", path: "/ranking", icon: Gauge },
];
