import { Outlet, useLocation } from "react-router-dom";
import { AppShell } from "@/layouts/shared/AppShell";
import { studentSidebarItems } from "./studentSidebar.config";
import { useMemo } from "react";

export function StudentLayout() {
  const location = useLocation();

  // Logic hiển thị tiêu đề động cho "Pro"
  const dynamicHeader = useMemo(() => {
    const currentPath = location.pathname;
    if (currentPath.includes("comment")) return { title: "Đề của bạn", sub: "Quản lý và theo dõi các đề thi đã đóng góp" };
    if (currentPath.includes("online-exam")) return { title: "Thi online", sub: "Khu vuc thi truc tuyen se duoc cap nhat noi dung tiep theo" };
    if (currentPath.includes("profile")) return { title: "Hồ sơ cá nhân", sub: "Thông tin tài khoản của bạn" };
    if (currentPath.includes("statistics")) return { title: "Thống kê", sub: "Phân tích kết quả học tập" };
    return { title: "Bảng điều khiển", sub: "Chào mừng bạn quay trở lại hệ thống" };
  }, [location.pathname]);

  return (
    <AppShell
      headerTitle={dynamicHeader.title}
      headerSubtitle={dynamicHeader.sub}
      sidebarItems={studentSidebarItems} // Lúc này studentSidebarItems đã có label và path
      sidebarSubtitle="Student Portal"
    >
      <div className="p-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Outlet />
      </div>
    </AppShell>
  );
}