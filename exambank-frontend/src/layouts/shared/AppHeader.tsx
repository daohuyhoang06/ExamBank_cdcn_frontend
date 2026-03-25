import { Bell, Search, Settings } from "lucide-react";

type Props = {
  title?: string;
  subtitle?: string;
};

export function AppHeader({
  title = "Scholarly Sanctuary",
  subtitle = "Xin chào",
}: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line-soft)] bg-white/88 px-6 py-4 backdrop-blur-xl">
      <div className="flex min-w-[16rem] items-center gap-3 rounded-full border border-[var(--line-soft)] bg-[var(--bg-page)] px-4 py-2.5">
        <Search size={16} className="text-[var(--ink-500)]" />
        <input
          aria-label="Tim kiem"
          placeholder="Tìm kiếm hệ thống..."
          className="w-full border-none bg-transparent text-sm text-[var(--ink-700)] outline-none placeholder:text-[var(--ink-500)]"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-full border border-transparent p-2 text-[var(--ink-600)] transition duration-200 hover:border-[var(--line-soft)] hover:bg-[var(--bg-page)]"
        >
          <Bell size={16} />
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[9px] font-bold text-white">
            4
          </span>
        </button>
        <button
          type="button"
          className="rounded-full border border-transparent p-2 text-[var(--ink-600)] transition duration-200 hover:border-[var(--line-soft)] hover:bg-[var(--bg-page)]"
        >
          <Settings size={16} />
        </button>

        <div className="mx-1 h-7 w-px bg-[var(--line-soft)]" />

        <div className="text-right">
          <p className="font-[var(--font-label)] text-xs text-[var(--ink-600)]">{title}</p>
          <p className="font-[var(--font-label)] text-xs font-semibold text-[var(--ink-900)]">{subtitle}</p>
        </div>
        <div className="h-10 w-10 rounded-full border-2 border-[var(--brand-100)] bg-[var(--brand-700)] text-center text-sm font-semibold leading-9 text-white">
          A
        </div>
      </div>
    </header>
  );
}
