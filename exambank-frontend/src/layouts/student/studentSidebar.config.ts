import {
  BarChart3,
  Crown,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  MonitorPlay,
  Settings,
  Sparkles,
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
  { label: "Vào thi private", path: "/user/private-competition", icon: LockKeyhole },
  { label: "Nâng cấp Premium", path: "/user/premium/upgrade", icon: Crown },
];

const aiPremiumItem: SidebarNavItem = {
  label: "AI Premium",
  path: "/user/premium/import",
  icon: Sparkles,
};

export function buildStudentSidebarItems(isPremium: boolean): SidebarNavItem[] {
  if (!isPremium) {
    return baseItems;
  }
  return [...baseItems, aiPremiumItem];
}
