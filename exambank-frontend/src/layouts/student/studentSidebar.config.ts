import { 
  LayoutDashboard, 
  UserCircle, 
  FileText, // Đã sửa: Viết liền, không có dấu cách
  BarChart3, 
  Settings,
  HelpCircle
} from "lucide-react";

// Khai báo interface để đồng bộ với AppShell
export interface SidebarNavItem {
  label: string;
  path: string;
  icon: any;
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
    label: "Đề của bạn",
    path: "/user/comment",
    icon: FileText,
  },
  {
    label: "Thống kê",
    path: "/user/statistics",
    icon: BarChart3,
  },
  {
    label: "Cài đặt",
    path: "/user/settings",
    icon: Settings,
  },
  {
    label: "Hỗ trợ",
    path: "/user/support",
    icon: HelpCircle,
  },
];