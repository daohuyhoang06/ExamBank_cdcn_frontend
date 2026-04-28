import {
  ClipboardCheck,
  FilePenLine,
  GraduationCap,
  NotebookPen,
  Trophy,
} from "lucide-react";
import type { SidebarNavItem } from "@/layouts/shared/AppSidebar";

export const moderatorSidebarItems: SidebarNavItem[] = [
  {
    label: "Kiểm duyệt nội dung",
    path: "/moderator/queue",
    icon: ClipboardCheck,
  },
  { label: "Tạo đề thi", path: "/moderator/composer", icon: FilePenLine },
  { label: "Chi tiết cuộc thi", path: "/moderator/exam-sessions", icon: Trophy },
  { label: "Grading Studio", path: "/moderator/grading", icon: GraduationCap },
  { label: "Editorial", path: "/moderator/editorial", icon: NotebookPen },
];
