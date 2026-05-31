import {
  BookOpen,
  FileText,
  Gauge,
  UserCog,
  Wallet,
} from "lucide-react";
import type { SidebarNavItem } from "@/layouts/shared/AppSidebar";

export const adminSidebarItems: SidebarNavItem[] = [
  { label: "Bảng điều khiển", path: "/admin/dashboard", icon: Gauge },
  { label: "Quản lý người dùng", path: "/admin/users", icon: UserCog },
  { label: "Quản lý tài liệu", path: "/admin/content", icon: FileText },
  { label: "Quản lý đề thi", path: "/admin/exams", icon: BookOpen },
  { label: "Tài chính", path: "/admin/financial", icon: Wallet },
];
