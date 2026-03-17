import { AppLayout } from "@/components/layout/app-layout";

export function ExamsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-blue-600">Exams</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Danh sách đề thi
          </h2>
          <p className="mt-2 text-slate-600">
            Đây là nơi hiển thị các bộ đề để người dùng tìm kiếm và bắt đầu làm bài.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Đề Toán 01</h3>
            <p className="mt-2 text-sm text-slate-600">50 câu • 60 phút</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Đề Lý 02</h3>
            <p className="mt-2 text-sm text-slate-600">40 câu • 45 phút</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Đề Hóa 03</h3>
            <p className="mt-2 text-sm text-slate-600">50 câu • 60 phút</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}