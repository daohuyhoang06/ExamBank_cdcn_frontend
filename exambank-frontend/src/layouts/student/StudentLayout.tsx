import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppShell } from "@/layouts/shared/AppShell";
import { buildStudentSidebarItems } from "./studentSidebar.config";
import { premiumUpgradeService } from "@/features/user/services/premium-upgrade.service";

export function StudentLayout() {
  const location = useLocation();
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    premiumUpgradeService
      .getStatus()
      .then((status) => {
        if (!mounted) {
          return;
        }
        setIsPremiumUser(Boolean(status.premium && status.confirmed));
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setIsPremiumUser(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sidebarItems = useMemo(() => buildStudentSidebarItems(isPremiumUser), [isPremiumUser]);

  const dynamicHeader = useMemo(() => {
    const currentPath = location.pathname;
    if (currentPath.includes("premium/upgrade")) {
      return { title: "Nâng cấp Premium", sub: "Thanh toán qua QR, upload bill và chờ admin duyệt" };
    }
    if (currentPath.includes("premium/import")) {
      return { title: "AI Premium", sub: "Import đề thi bằng AI và tạo competition private" };
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
      showAdminExtras
    >
      <div className="animate-in slide-in-from-bottom-2 fade-in p-1 duration-500">
        <Outlet />
      </div>
    </AppShell>
  );
}
