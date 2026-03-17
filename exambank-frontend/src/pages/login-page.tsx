import { AuthLayout } from "@/components/layout/auth-layout";

export function LoginPage() {
  return (
    <AuthLayout>
      <div className="mx-auto max-w-md">
        <p className="text-sm font-medium text-blue-600">Đăng nhập</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">
          Chào mừng quay lại
        </h2>
        <p className="mt-3 text-slate-600">
          Đây là khu vực đăng nhập của hệ thống ExamBank.
        </p>

        <form className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              placeholder="nhapemail@example.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}