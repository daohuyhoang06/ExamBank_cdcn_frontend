import { Bell, LogOut, Search, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type NotificationType = "moderation" | "financial" | "system" | "community";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  unread?: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "3 new exams in your queue",
    description:
      "Advanced Calculus and Quantum Physics modules require your immediate academic verification.",
    time: "2 minutes ago",
    type: "moderation",
    unread: true,
  },
  {
    id: "notif-2",
    title: "You earned 50 credits for a top-rated exam",
    description:
      "Your 'Late Renaissance History' exam has been rated 5 stars by 12 students this week.",
    time: "1 hour ago",
    type: "financial",
  },
  {
    id: "notif-3",
    title: "New exam version 2.4 released",
    description:
      "The grading engine has been optimized for improved LaTeX support in mathematical equations.",
    time: "4 hours ago",
    type: "system",
  },
  {
    id: "notif-4",
    title: "Someone replied to your comment",
    description:
      "Professor Higgins mentioned you in the discussion thread about mock exam structure.",
    time: "1 day ago",
    type: "community",
  },
];

const notificationTypeStyles: Record<
  NotificationType,
  {
    badge: string;
    icon: string;
    label: string;
  }
> = {
  moderation: {
    badge: "bg-blue-100 text-blue-700",
    icon: "bg-blue-600",
    label: "Moderation",
  },
  financial: {
    badge: "bg-amber-100 text-amber-700",
    icon: "bg-amber-500",
    label: "Financial",
  },
  system: {
    badge: "bg-emerald-100 text-emerald-700",
    icon: "bg-emerald-500",
    label: "System",
  },
  community: {
    badge: "bg-slate-200 text-slate-700",
    icon: "bg-slate-500",
    label: "Community",
  },
};

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
  const [notificationItems, setNotificationItems] = useState(initialNotifications);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = notificationItems.filter((item) => item.unread).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(target)) {
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
        <div className="relative" ref={notificationMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotificationOpen((prev) => !prev);
              setIsAvatarMenuOpen(false);
            }}
            className="relative rounded-full border border-transparent p-2 text-[var(--ink-600)] transition duration-200 hover:border-[var(--line-soft)] hover:bg-[var(--bg-page)]"
            aria-label="Mở thông báo"
            aria-haspopup="dialog"
            aria-expanded={isNotificationOpen}
          >
            <Bell size={16} />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {isNotificationOpen ? (
            <div
              role="dialog"
              aria-label="Thông báo"
              className="absolute right-0 top-12 z-30 w-[22.5rem] overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[#eef0f4] shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
                <h3 className="font-[var(--font-label)] text-[0.82rem] font-semibold text-[var(--brand-700)]">
                  Notifications
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationItems((prev) => prev.map((item) => ({ ...item, unread: false })));
                  }}
                  className="text-[9px] font-semibold text-emerald-700 transition hover:text-emerald-800"
                >
                  Mark all as read
                </button>
              </div>

              <div className="max-h-[21rem] overflow-y-auto px-2 pb-2">
                {notificationItems.map((item) => {
                  const itemStyle = notificationTypeStyles[item.type];

                  return (
                    <article
                      key={item.id}
                      className="relative mb-1.5 rounded-xl bg-white/70 px-3 py-2.5"
                    >
                      <div className="flex gap-2.5">
                        <div className="pt-0.5">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white ${itemStyle.icon}`}
                            aria-hidden="true"
                          >
                            <Bell size={12} />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <p className="text-[0.72rem] font-semibold leading-4 text-[var(--ink-900)]">
                              {item.title}
                            </p>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.07em] ${itemStyle.badge}`}
                              >
                                {itemStyle.label}
                              </span>
                              {item.unread ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-700" aria-label="Chưa đọc" />
                              ) : null}
                            </div>
                          </div>
                          <p className="text-[0.64rem] leading-3.5 text-[var(--ink-600)]">{item.description}</p>
                          <p className="mt-1 text-[9px] text-[var(--ink-500)]">{item.time}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="px-3 pb-3 pt-1">
                <button
                  type="button"
                  className="w-full rounded-lg bg-[var(--brand-700)] px-3 py-2 text-[10px] font-semibold text-white transition hover:brightness-110"
                >
                  View all notifications
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
