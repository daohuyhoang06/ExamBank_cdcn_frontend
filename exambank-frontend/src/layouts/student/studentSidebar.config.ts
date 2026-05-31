import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MonitorPlay,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const baseItems: SidebarNavItem[] = [
  { label: "Trang chủ", path: "/user", icon: LayoutDashboard },
  { label: "Ngân hàng đề", path: "/user/exambank", icon: FileText },
  { label: "Bài đã nộp", path: "/user/exambank/mysubmit", icon: BarChart3 },
  { label: "Tải đề lên", path: "/user/exambank/submit", icon: Settings },
  { label: "Thi online", path: "/user/online-exam", icon: MonitorPlay },
];

export function buildStudentSidebarItems(): SidebarNavItem[] {
  return baseItems;
}
