import { Outlet } from "react-router-dom";
import { AdminLayout } from "@/layouts/admin/AdminLayout";

const header = {
  title: "Admin",
  subtitle: "Quản trị viên",
};

export default function AdminShell() {
  return (
    <AdminLayout
      headerTitle={header.title}
      headerSubtitle={header.subtitle}
    >
      <Outlet />
    </AdminLayout>
  );
}
