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
      return { title: "Nang cap Premium", sub: "Thanh toan qua QR, upload bill va cho admin duyet" };
    }
    if (currentPath.includes("premium/import")) {
      return { title: "AI Premium", sub: "Import de thi bang AI va tao competition private" };
    }
    if (currentPath.includes("comment")) {
      return { title: "De cua ban", sub: "Quan ly va theo doi cac de thi da dong gop" };
    }
    if (currentPath.includes("online-exam")) {
      return { title: "Thi online", sub: "Khu vuc thi truc tuyen" };
    }
    if (currentPath.includes("profile")) {
      return { title: "Ho so ca nhan", sub: "Thong tin tai khoan cua ban" };
    }
    return { title: "Bang dieu khien", sub: "Chao mung ban quay tro lai he thong" };
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
