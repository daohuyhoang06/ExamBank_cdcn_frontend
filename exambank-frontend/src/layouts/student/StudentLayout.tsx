import { useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppShell } from "@/layouts/shared/AppShell";
import { buildStudentSidebarItems } from "./studentSidebar.config";
import { getStoredAuthToken } from "@/lib/api-client";
import { userService } from "@/features/user/services/user.service";
import { getStoredAuthUser, syncStoredAuthUser } from "@/features/auth/services/auth.service";

export function StudentLayout() {
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    if (!getStoredAuthToken()) {
      return () => {
        mounted = false;
      };
    }
    userService
      .getMyProfile()
      .then((profile) => {
        if (!mounted) {
          return;
        }
        const currentUser = getStoredAuthUser();
        if (!currentUser) {
          return;
        }
        syncStoredAuthUser({
          ...currentUser,
          fullName: profile.name || currentUser.fullName,
          email: profile.email || currentUser.email,
          coinBalance: profile.coinBalance,
        });
      })
      .catch(() => {
        // Ignore profile sync failure; existing auth state is still valid.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const sidebarItems = useMemo(() => buildStudentSidebarItems(), []);

  const dynamicHeader = useMemo(() => {
    const currentPath = location.pathname;
    if (currentPath.includes("premium/upgrade")) {
      return { title: "Nâng cấp Premium", sub: "Thanh toán qua QR, upload bill và chờ admin duyệt" };
    }
    if (currentPath.includes("comment")) {
      return { title: "Đề của bạn", sub: "Quản lý và theo dõi các đề thi đã đóng góp" };
    }
    if (currentPath.includes("online-exam")) {
      return { title: "Thi online", sub: "Khu vực thi trực tuyến" };
    }
    if (currentPath.includes("profile")) {
      return { title: "Hồ sơ cá nhân", sub: "Thông tin tài khoản của bạn" };
    }
    return { title: "Bảng điều khiển", sub: "Chào mừng bạn quay trở lại hệ thống" };
  }, [location.pathname]);

  return (
    <AppShell
      headerTitle={dynamicHeader.title}
      headerSubtitle={dynamicHeader.sub}
      sidebarItems={sidebarItems}
      sidebarSubtitle="Student Portal"
    >
      <div className="animate-in slide-in-from-bottom-2 fade-in p-1 duration-500">
        <Outlet />
      </div>
    </AppShell>
  );
}
