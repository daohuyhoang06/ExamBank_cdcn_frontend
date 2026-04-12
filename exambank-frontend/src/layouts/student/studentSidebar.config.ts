import { 
  LayoutDashboard, 
  UserCircle, 
  FileText,
  BarChart3, 
  Settings,
  HelpCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Khai báo interface để đồng bộ với AppShell
export interface SidebarNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const studentSidebarItems: SidebarNavItem[] = [
  {
    label: "Trang chủ",
    path: "/user",
    icon: LayoutDashboard,
  },
  {
    label: "Hồ sơ",
    path: "/user/profile",
    icon: UserCircle,
  },
  {
    label: "Ngân hàng đề",
    path: "/user/exambank",
    icon: FileText,
  },
  {
    label: "Bài đã nộp",
    path: "/user/exambank/mysubmit",
    icon: BarChart3,
  },
  {
    label: "Tải đề lên",
    path: "/user/exambank/submit",
    icon: Settings,
  },
  {
    label: "Thảo luận đề",
    path: "/user/comment",
    icon: HelpCircle,
  },
];