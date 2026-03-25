import {
  BookOpen,
  CircleHelp,
  FileText,
  Gauge,
  ShieldCheck,
  UserCog,
  Wallet,
} from "lucide-react";
import type { SidebarNavItem } from "@/layouts/shared/AppSidebar";

export const adminSidebarItems: SidebarNavItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", icon: Gauge },
  { label: "User Management", path: "/admin/users", icon: UserCog },
  { label: "Content Moderation", path: "/admin/content", icon: FileText },
  { label: "Exam Management", path: "/admin/exams", icon: BookOpen },
  { label: "Question Bank", path: "/admin/question-bank", icon: ShieldCheck },
  { label: "Financials", path: "/admin/financial", icon: Wallet },
  { label: "System Configuration", path: "/admin/system", icon: CircleHelp },
];
