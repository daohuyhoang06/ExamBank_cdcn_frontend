import { 
  LayoutDashboard, 
  FileText,
  BarChart3, 
  Settings,
  MonitorPlay,
  LockKeyhole,
  Sparkles,
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
    label: "Thi online",
    path: "/user/online-exam",
    icon: MonitorPlay,
  },
  {
    label: "Vào thi private",
    path: "/user/private-competition",
    icon: LockKeyhole,
  },
  {
    label: "AI Premium",
    path: "/user/premium/import",
    icon: Sparkles,
  },
];
