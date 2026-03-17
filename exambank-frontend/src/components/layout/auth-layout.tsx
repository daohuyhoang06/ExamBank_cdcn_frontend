import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AuthLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">
          <div className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                ExamBank
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight">
                Nền tảng luyện đề và theo dõi tiến độ học tập
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Đăng nhập để tiếp tục làm bài, xem kết quả và quản lý lộ trình ôn tập.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-300">Trạng thái hệ thống</p>
              <p className="mt-2 text-lg font-semibold text-white">
                Frontend đang hoạt động ổn định
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">{children}</div>
        </div>
      </div>
    </main>
  );
}