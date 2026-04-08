import { Bell, LogOut, Search, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationPopover } from "./notification-popover";
import type { NotificationItem } from "./notification-popover";
import { clearStoredAuthUser, getStoredAuthUser } from "@/features/auth/services/auth.service";
import { setAuthToken } from "@/lib/api-client";

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

type Props = {
  title?: string;
  subtitle?: string;
  notificationItems?: NotificationItem[];
};

export function AppHeader({
  title = "Scholarly Sanctuary",
  subtitle = "Xin chào",
  notificationItems: notificationItemsProp,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isStudentArea = location.pathname.startsWith("/user");

  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>(
    notificationItemsProp ?? initialNotifications
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notificationItems.filter((item) => item.unread).length;

  const currentUserDisplayName = (() => {
    const fallbackName = "Người dùng";
    const currentUser = getStoredAuthUser() as
      | {
          fullName?: string;
          name?: string;
          email?: string;
        }
      | null;

    return currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? fallbackName;
  })();

  const avatarInitial = (currentUserDisplayName.trim().charAt(0) || "A").toUpperCase();
  const headerMetaTitle = isStudentArea ? "Tài khoản" : title;
  const headerMetaSubtitle = currentUserDisplayName || subtitle;

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
    setAuthToken(null);
    clearStoredAuthUser();
    setIsAvatarMenuOpen(false);
    navigate("/login");
  }

  function handleNotificationItemClick(item: NotificationItem) {
    setNotificationItems((prev) =>
      prev.map((notification) =>
        notification.id === item.id ? { ...notification, unread: false } : notification
      )
    );

    setIsNotificationOpen(false);

    if (item.href) {
      navigate(item.href);
    }
  }

  function handleViewAllNotifications() {
    setIsNotificationOpen(false);

    if (location.pathname.startsWith("/admin")) {
      navigate("/admin/notifications");
      return;
    }

    navigate("/notifications");
  }

  return (
    <header className="relative z-40 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line-soft)] bg-white/88 px-6 py-4 backdrop-blur-xl">
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
            <NotificationPopover
              items={notificationItems}
              onMarkAllAsRead={() => {
                setNotificationItems((prev) =>
                  prev.map((item) => ({ ...item, unread: false }))
                );
              }}
              onItemClick={handleNotificationItemClick}
              onViewAll={handleViewAllNotifications}
            />
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
          <p className="font-[var(--font-label)] text-xs text-[var(--ink-600)]">{headerMetaTitle}</p>
          <p className="font-[var(--font-label)] text-xs font-semibold text-[var(--ink-900)]">
            {headerMetaSubtitle}
          </p>
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
            {avatarInitial}
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