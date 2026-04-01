import { Bell, LogOut, Search, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  title?: string;
  subtitle?: string;
};

export function AppHeader({
  title = "Scholarly Sanctuary",
  subtitle = "Xin chào",
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!avatarMenuRef.current) {
        return;
      }

      if (!avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleOpenProfile() {
    if (location.pathname.startsWith("/admin")) {
      navigate("/admin/profile");
      setIsAvatarMenuOpen(false);
      return;
    }

    navigate("/profile");
    setIsAvatarMenuOpen(false);
  }

  function handleLogout() {
    setIsAvatarMenuOpen(false);
    navigate("/login");
  }

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
        <div className="relative" ref={avatarMenuRef}>
          <button
            type="button"
            onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
            className="h-10 w-10 rounded-full border-2 border-[var(--brand-100)] bg-[var(--brand-700)] text-center text-sm font-semibold leading-9 text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2"
            aria-label="Mở menu tài khoản"
            aria-haspopup="menu"
            aria-expanded={isAvatarMenuOpen}
            title="Tài khoản"
          >
            A
          </button>

          {isAvatarMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-12 z-20 w-44 rounded-2xl border border-[var(--line-soft)] bg-white p-2 shadow-[var(--shadow-soft)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenProfile}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ink-700)] transition hover:bg-[var(--bg-page)]"
              >
                <User size={14} /> Xem hồ sơ
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
              >
                <LogOut size={14} /> Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
