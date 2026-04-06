import {
  ClipboardCheck,
  FilePenLine,
  GraduationCap,
  NotebookPen,
} from "lucide-react";
import type { SidebarNavItem } from "@/layouts/shared/AppSidebar";

export const moderatorSidebarItems: SidebarNavItem[] = [
  {
    label: "Hàng chờ kiểm duyệt",
    path: "/moderator/queue",
    icon: ClipboardCheck,
  },
  { label: "Tạo đề thi", path: "/moderator/composer", icon: FilePenLine },
  { label: "Grading Studio", path: "/moderator/grading", icon: GraduationCap },
  { label: "Editorial", path: "/moderator/editorial", icon: NotebookPen },
];
