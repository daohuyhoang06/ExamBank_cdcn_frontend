import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bell, Building2, ChevronLeft, ChevronRight, Headset, LogOut, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { NotificationPopover } from './notification-popover';
import type { NotificationItem } from './notification-popover';
import { AUTH_USER_UPDATED_EVENT, clearStoredAuthUser, getStoredAuthUser } from '@/features/auth/services/auth.service';
import { setAuthToken } from '@/lib/api-client';

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: '3 new exams in your queue',
    description:
      'Advanced Calculus and Quantum Physics modules require your immediate academic verification.',
    time: '2 minutes ago',
    type: 'moderation',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'You earned 50 credits for a top-rated exam',
    description:
      "Your 'Late Renaissance History' exam has been rated 5 stars by 12 students this week.",
    time: '1 hour ago',
    type: 'financial',
  },
  {
    id: 'notif-3',
    title: 'New exam version 2.4 released',
    description:
      'The grading engine has been optimized for improved LaTeX support in mathematical equations.',
    time: '4 hours ago',
    type: 'system',
  },
  {
    id: 'notif-4',
    title: 'Someone replied to your comment',
    description:
      'Professor Higgins mentioned you in the discussion thread about mock exam structure.',
    time: '1 day ago',
    type: 'community',
  },
];

export type SidebarNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

type Props = {
  items: SidebarNavItem[];
  subtitle: string;
  showAdminExtras?: boolean;
  notificationItems?: NotificationItem[];
};

export function AppSidebar({
  items,
  subtitle,
  showAdminExtras = false,
  notificationItems: notificationItemsProp,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const isExpanded = !isCollapsed;

  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>(
    notificationItemsProp ?? initialNotifications
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState(() => {
    const fallbackName = 'Nguoi dung';
    const currentUser = getStoredAuthUser() as
      | {
          fullName?: string;
          name?: string;
          email?: string;
        }
      | null;

    return currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? fallbackName;
  });
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState(() => {
    const currentUser = getStoredAuthUser() as
      | {
          avatarUrl?: string;
        }
      | null;

    return currentUser?.avatarUrl ?? '';
  });

  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notificationItems.filter((item) => item.unread).length;
  const avatarInitial = (currentUserDisplayName.trim().charAt(0) || 'A').toUpperCase();

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

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleAuthUserUpdated() {
      const fallbackName = 'Nguoi dung';
      const currentUser = getStoredAuthUser() as
        | {
            fullName?: string;
            name?: string;
            email?: string;
            avatarUrl?: string;
          }
        | null;

      setCurrentUserDisplayName(currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? fallbackName);
      setCurrentUserAvatarUrl(currentUser?.avatarUrl ?? '');
    }

    window.addEventListener(AUTH_USER_UPDATED_EVENT, handleAuthUserUpdated);
    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, handleAuthUserUpdated);
    };
  }, []);

  function handleOpenProfile() {
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin/profile');
      setIsAvatarMenuOpen(false);
      return;
    }

    if (location.pathname.startsWith('/moderator')) {
      navigate('/moderator/profile');
      setIsAvatarMenuOpen(false);
      return;
    }

    navigate('/user/profile');
    setIsAvatarMenuOpen(false);
  }

  function handleLogout() {
    setAuthToken(null);
    clearStoredAuthUser();
    setIsAvatarMenuOpen(false);
    navigate('/', { replace: true });
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

    if (location.pathname.startsWith('/admin')) {
      navigate('/admin/notifications');
      return;
    }

    navigate('/notifications');
  }

  const normalizePath = (path: string): string => {
    if (!path) return '/';
    const normalized = path.replace(/\/+$/, '');
    return normalized.length > 0 ? normalized : '/';
  };

  const currentPath = normalizePath(location.pathname);
  const matchedItemPaths = items
    .map((item) => {
      const targetPath = normalizePath(item.path);
      const depth = targetPath.split('/').filter(Boolean).length;
      const isTopLevelRoot = depth === 1;
      const matches = isTopLevelRoot
        ? currentPath === targetPath
        : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

      return { path: item.path, targetPath, matches };
    })
    .filter((entry) => entry.matches)
    .sort((left, right) => right.targetPath.length - left.targetPath.length);

  const activeItemPath = matchedItemPaths[0]?.path;

  return (
    <aside
      className={`
        hidden h-screen shrink-0 md:flex md:flex-col
        border-r border-[var(--line-soft)] bg-[#f2f5fa]
        transition-all duration-300 ease-in-out
        relative
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      <button
        onClick={toggleSidebar}
        aria-label={isCollapsed ? 'Mo rong sidebar' : 'Thu gon sidebar'}
        className={`
          absolute top-20 -right-3
          w-6 h-6 rounded-full
          bg-white border border-[var(--line-soft)]
          shadow-[0_2px_8px_rgba(0,0,0,0.1)]
          flex items-center justify-center
          transition-all duration-200 ease-in-out
          hover:scale-110 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]
          hover:text-[var(--brand-700)]
          active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]
          z-10
        `}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`px-6 py-5 transition-all duration-300 ${!isExpanded && 'px-2'}`}>
        <div className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'}`}>
          <div className="rounded-2xl bg-[linear-gradient(135deg,var(--brand-700)_0%,var(--brand-600)_100%)] p-2.5 text-white shadow-[var(--shadow-brand)]">
            <Building2 size={20} />
          </div>

          <div
            className={`
              transition-opacity duration-200
              ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}
            `}
          >
            <p className="whitespace-nowrap font-[var(--font-label)] text-[2.45rem] font-semibold tracking-[0.01em] text-[var(--ink-900)]">
              Scholarly Sanctuar
            </p>
            <p className="-mt-1 inline-block origin-left whitespace-nowrap text-[8px] uppercase leading-none tracking-[0.12em] text-[var(--ink-500)] scale-[0.7]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <nav className={`flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-4 transition-all ${!isExpanded && 'p-2'}`}>
        {items.map((item) => {
          const isActive = activeItemPath === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={isCollapsed ? toggleSidebar : undefined}
              title={!isExpanded ? item.label : undefined}
              aria-label={!isExpanded ? item.label : undefined}
              className={`
                group inline-flex items-center text-sm font-medium
                transition-all duration-200 ease-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]
                ${isExpanded ? 'gap-3 py-3 px-4 mr-3' : 'h-11 w-11 justify-center self-center'}
                ${
                  isActive
                    ? `${isExpanded ? 'translate-x-1 -translate-y-0.5 rounded-r-full' : 'rounded-xl'} bg-[var(--brand-100)]/70 text-[var(--brand-700)] ring-1 ring-[var(--brand-100)] shadow-[0_12px_22px_rgba(11,59,120,0.14)]`
                    : `${isExpanded ? 'hover:translate-x-1 hover:-translate-y-0.5' : ''} rounded-xl text-[var(--brand-700)] hover:bg-[var(--brand-100)]/55 hover:text-[var(--brand-700)] hover:shadow-[0_10px_18px_rgba(11,59,120,0.10)]`
                }
              `}
            >
              <Icon
                size={isExpanded ? 16 : 20}
                className={`transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
              />

              <span
                className={`
                  transition-opacity duration-200
                  ${isExpanded ? 'opacity-100' : 'hidden'}
                `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto p-4 ${!isExpanded && 'p-2'}`}>
        <div className={`flex flex-col ${isExpanded ? 'gap-3' : 'gap-2 items-center'}`}>
          <div className={`relative ${!isExpanded ? 'self-center' : ''}`} ref={notificationMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
                setIsAvatarMenuOpen(false);
              }}
              title={!isExpanded ? 'Thông báo' : undefined}
              aria-label="Mở thông báo"
              aria-haspopup="dialog"
              aria-expanded={isNotificationOpen}
              className={`
                group relative inline-flex items-center text-sm font-medium
                transition-all duration-200 ease-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]
                ${isExpanded ? 'gap-3 py-3 px-4 mr-3' : 'h-11 w-11 justify-center'}
                ${
                  isNotificationOpen
                    ? `${isExpanded ? 'translate-x-1 -translate-y-0.5 rounded-r-full' : 'rounded-xl'} bg-[var(--brand-100)]/70 text-[var(--brand-700)] ring-1 ring-[var(--brand-100)] shadow-[0_12px_22px_rgba(11,59,120,0.14)]`
                    : `${isExpanded ? 'hover:translate-x-1 hover:-translate-y-0.5' : ''} rounded-xl text-[var(--brand-700)] hover:bg-[var(--brand-100)]/55 hover:text-[var(--brand-700)] hover:shadow-[0_10px_18px_rgba(11,59,120,0.10)]`
                }
              `}
            >
              <div className="relative flex items-center justify-center">
                <Bell
                  size={isExpanded ? 16 : 20}
                  className={`transition-transform duration-200 ${isNotificationOpen ? 'scale-105' : 'group-hover:scale-105'}`}
                />

                {unreadCount > 0 ? (
                  <span
                    className={`
                      absolute -top-1 -right-1.5
                      inline-flex items-center justify-center
                      ${unreadCount > 9 ? 'h-4 min-w-5 px-1.5' : 'h-4 w-4'}
                      rounded-full
                      bg-[#F87171]
                      border-2 border-[#f2f5fa]
                      text-[9px] font-bold text-white
                      shadow-sm
                    `}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </div>

              <span
                className={`
                  transition-opacity duration-200
                  ${isExpanded ? 'opacity-100' : 'hidden'}
                `}
              >
                Thông báo
              </span>
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

          {showAdminExtras && (
            <button
              type="button"
              title={!isExpanded ? 'Support Portal' : undefined}
              aria-label="Support Portal"
              className={`
                group inline-flex items-center text-sm font-medium
                transition-all duration-200 ease-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)]
                ${isExpanded ? 'gap-3 py-3 px-4 mr-3' : 'h-11 w-11 justify-center self-center'}
                ${isExpanded ? 'hover:translate-x-1 hover:-translate-y-0.5' : ''}
                rounded-xl text-[var(--brand-700)] hover:bg-[var(--brand-100)]/55 hover:text-[var(--brand-700)] hover:shadow-[0_10px_18px_rgba(11,59,120,0.10)]
              `}
            >
              <Headset
                size={isExpanded ? 16 : 20}
                className="transition-transform duration-200 group-hover:scale-105"
              />

              <span
                className={`
                  transition-opacity duration-200
                  ${isExpanded ? 'opacity-100' : 'hidden'}
                `}
              >
                Support Portal
              </span>
            </button>
          )}

          <div className={`flex ${isExpanded ? 'gap-3 items-center' : 'flex-col gap-2 items-center'}`}>
            <div className="relative" ref={avatarMenuRef}>
              {isAvatarMenuOpen ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-full border-2 border-[rgba(31,99,180,0.7)] animate-pulse"
                />
              ) : null}
              <button
                type="button"
                onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                className={`${isExpanded ? 'h-10 w-10' : 'h-11 w-11'} overflow-hidden rounded-full border-2 bg-[var(--brand-700)] text-center text-sm font-semibold leading-9 text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 ${isAvatarMenuOpen ? 'border-[var(--brand-500)] shadow-[0_0_0_4px_rgba(31,99,180,0.18),0_10px_24px_rgba(11,59,120,0.28)] scale-105' : 'border-[var(--brand-100)] hover:brightness-110'}`}
                aria-label="Mở menu tài khoảnS"
                aria-haspopup="menu"
                aria-expanded={isAvatarMenuOpen}
                title={!isExpanded ? 'Tài khoản' : undefined}
              >
                {currentUserAvatarUrl ? (
                  <img src={currentUserAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </button>

              {isAvatarMenuOpen ? (
                <div
                  role="menu"
                  className={`absolute ${isExpanded ? 'left-0 bottom-full mb-2' : 'left-full ml-2 bottom-0'} z-20 w-44 rounded-2xl border border-[var(--line-soft)] bg-white p-2 shadow-[var(--shadow-soft)]`}
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

            {isExpanded && (
              <div className="flex-1 text-left">
                <p className="truncate font-[var(--font-label)] text-xs font-semibold text-[var(--ink-900)]">
                  {currentUserDisplayName}
                </p>
                <p className="truncate font-[var(--font-label)] text-[10px] text-[var(--ink-600)]">Tài khoản</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
