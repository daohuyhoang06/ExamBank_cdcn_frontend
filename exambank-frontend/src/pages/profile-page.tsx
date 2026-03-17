import { AppLayout } from "@/components/layout/app-layout";

export function ProfilePage() {
  return (
    <AppLayout>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-blue-600">Profile</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Hồ sơ cá nhân</h2>
        <p className="mt-2 text-slate-600">
          Trang này sẽ hiển thị thông tin người dùng, tiến độ và cài đặt tài khoản.
        </p>
      </div>
    </AppLayout>
  );
}
