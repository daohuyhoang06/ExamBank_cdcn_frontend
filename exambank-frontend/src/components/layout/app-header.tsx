export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <p className="text-sm text-slate-500">Xin chào</p>
        <h1 className="text-lg font-semibold text-slate-900">ExamBank</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Thông báo
        </button>
        <div className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
          U
        </div>
      </div>
    </header>
  );
}