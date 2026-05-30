import { useCallback, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bell, Building2, ChevronLeft, ChevronRight, Crown, Headset, LogOut, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { NotificationPopover } from './notification-popover';
import type { NotificationItem, NotificationType } from './notification-popover';
import { AUTH_USER_UPDATED_EVENT, clearStoredAuthUser, getStoredAuthUser } from '@/features/auth/services/auth.service';
import { getStoredAuthToken, setAuthToken } from '@/lib/api-client';
import { premiumUpgradeService } from '@/features/user/services/premium-upgrade.service';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationView,
} from '@/features/system/services/notification.service';

const NOTIFICATIONS_PAGE_SIZE = 20;

const normalizeRoles = (user: { role?: string; roles?: string[] } | null): string[] => {
  return [user?.role, ...(user?.roles ?? [])]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toUpperCase().replace('ROLE_', ''));
};

const normalizeNotificationType = (value?: string | null): string => {
  return (value ?? '').trim().toUpperCase();
};

const extractQuotedTitle = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const match = value.match(/'([^']+)'/);
  return match ? match[1].trim() : null;
};

const extractNote = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const match = value.match(/note:\s*(.+)$/i);
  return match ? match[1].trim() : null;
};

const mapNotificationCategory = (type?: string | null): NotificationType => {
  const normalized = normalizeNotificationType(type);
  if (
    normalized === 'DOC_APPROVED' ||
    normalized === 'DOC_REJECTED' ||
    normalized === 'DOC_SUBMITTED_FOR_REVIEW' ||
    normalized === 'REPORT_HANDLED' ||
    normalized === 'AI_IMPORT_COMPLETED' ||
    normalized === 'AI_IMPORT_FAILED'
  ) {
    return 'moderation';
  }
  if (
    normalized === 'COIN_EARNED' ||
    normalized === 'PREMIUM_PAYMENT_PENDING_REVIEW' ||
    normalized === 'PREMIUM_APPROVED' ||
    normalized === 'PREMIUM_REJECTED'
  ) {
    return 'financial';
  }
  if (normalized === 'DISCUSSION_ACTIVITY') {
    return 'community';
  }
  return 'system';
};

const formatRelativeTime = (isoDate?: string | null): string => {
  if (!isoDate) {
    return 'Vá»«a xong';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Vá»«a xong';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) {
    return 'Vá»«a xong';
  }
  if (diffMins < 60) {
    return `${diffMins} phÃºt trÆ°á»›c`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} giá» trÆ°á»›c`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngÃ y trÆ°á»›c`;
};

const localizeNotificationContent = (
  notification: NotificationView
): { title: string; description: string } => {
  const type = normalizeNotificationType(notification.type);
  const rawTitle = (notification.title ?? '').trim();
  const rawMessage = (notification.message ?? '').trim();
  const docTitle = extractQuotedTitle(rawMessage) ?? extractQuotedTitle(rawTitle);
  const note = extractNote(rawMessage);

  if (type === 'DOC_APPROVED') {
    return {
      title: 'TÃ i liá»‡u Ä‘Æ°á»£c duyá»‡t',
      description: docTitle
        ? `TÃ i liá»‡u '${docTitle}' Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t.`
        : 'TÃ i liá»‡u cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t.',
    };
  }

  if (type === 'DOC_REJECTED') {
    const base = docTitle
      ? `TÃ i liá»‡u '${docTitle}' Ä‘Ã£ bá»‹ tá»« chá»‘i.`
      : 'TÃ i liá»‡u cá»§a báº¡n Ä‘Ã£ bá»‹ tá»« chá»‘i.';
    return {
      title: 'TÃ i liá»‡u bá»‹ tá»« chá»‘i',
      description: note ? `${base} Ghi chÃº: ${note}` : base,
    };
  }

  if (type === 'DOC_SUBMITTED_FOR_REVIEW') {
    return {
      title: 'TÃ i liá»‡u chá» duyá»‡t',
      description: docTitle
        ? `TÃ i liá»‡u má»›i '${docTitle}' Ä‘ang chá» duyá»‡t.`
        : 'CÃ³ tÃ i liá»‡u má»›i Ä‘ang chá» duyá»‡t.',
    };
  }

  if (type === 'DISCUSSION_ACTIVITY') {
    const normalized = rawMessage.toLowerCase();
    let description = rawMessage;
    if (!description) {
      description = 'CÃ³ cáº­p nháº­t má»›i trong tháº£o luáº­n.';
    } else if (normalized.includes('moderation visibility') || normalized.includes('discussion thread')) {
      description = 'CÃ³ tháº£o luáº­n má»›i cáº§n theo dÃµi.';
    } else if (normalized.includes('new reply') || normalized.includes('reply')) {
      description = 'Tháº£o luáº­n cá»§a báº¡n cÃ³ pháº£n há»“i má»›i.';
    }

    return {
      title: 'Hoáº¡t Ä‘á»™ng tháº£o luáº­n',
      description,
    };
  }

  if (type === 'COIN_EARNED') {
    return {
      title: 'Xu thÆ°á»Ÿng',
      description: rawMessage || 'Báº¡n vá»«a nháº­n Ä‘Æ°á»£c xu thÆ°á»Ÿng.',
    };
  }

  if (type === 'SCORE_UPDATED') {
    return {
      title: 'Cáº­p nháº­t Ä‘iá»ƒm',
      description: rawMessage || 'Äiá»ƒm cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t.',
    };
  }

  if (type === 'REPORT_HANDLED') {
    return {
      title: 'BÃ¡o cÃ¡o Ä‘Ã£ xá»­ lÃ½',
      description: docTitle
        ? `BÃ¡o cÃ¡o vá» tÃ i liá»‡u '${docTitle}' Ä‘Ã£ Ä‘Æ°á»£c xá»­ lÃ½.`
        : 'BÃ¡o cÃ¡o cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c xá»­ lÃ½.',
    };
  }

  if (type === 'SR_REMINDER') {
    return {
      title: 'Nháº¯c nhá»Ÿ',
      description: rawMessage || 'Báº¡n cÃ³ má»™t nháº¯c nhá»Ÿ má»›i.',
    };
  }

  if (type === 'AI_IMPORT_COMPLETED') {
    return {
      title: 'AI import hoàn tất',
      description: rawMessage || 'Đề AI đã trích xuất xong, hãy mở form để xác nhận.',
    };
  }

  if (type === 'AI_IMPORT_FAILED') {
    return {
      title: 'AI import thất bại',
      description: rawMessage || 'AI không thể trích xuất đề từ file đã gửi.',
    };
  }
  return {
    title: rawTitle || 'ThÃ´ng bÃ¡o',
    description: rawMessage || 'Báº¡n cÃ³ má»™t thÃ´ng bÃ¡o má»›i.',
  };
};

const buildNotificationHref = (
  notification: NotificationView,
  roles: string[]
): string | undefined => {
  const normalizedTarget = normalizeNotificationType(notification.targetType);
  const normalizedType = normalizeNotificationType(notification.type);
  const isAdmin = roles.includes('ADMIN');
  const isModerator = roles.includes('MODERATOR');

  if (normalizedTarget === 'DOCUMENT') {
    if (isAdmin) {
      return '/admin/content';
    }
    if (isModerator) {
      return '/moderator/queue';
    }
    return '/user/exambank';
  }

  if (normalizedTarget === 'DISCUSSION') {
    if (notification.targetId) {
      return `/user/comment/${notification.targetId}`;
    }
    return '/user/comment';
  }

  if (normalizedTarget === 'AI_IMPORT_JOB' && notification.targetId) {
    return `/moderator/composer/form?aiImportJobId=${notification.targetId}`;
  }

  if (normalizedType === 'COIN_EARNED') {
    return isAdmin ? '/admin/financial' : '/user/profile';
  }

  if (normalizedType === 'SCORE_UPDATED') {
    return '/user/online-exam';
  }

  if (
    normalizedType === 'PREMIUM_PAYMENT_PENDING_REVIEW' ||
    normalizedType === 'PREMIUM_APPROVED' ||
    normalizedType === 'PREMIUM_REJECTED' ||
    normalizedTarget === 'PREMIUM_ORDER'
  ) {
    return isAdmin ? '/admin/financial' : '/user/premium/upgrade';
  }

  return undefined;
};

const toNotificationItem = (
  notification: NotificationView,
  roles: string[]
): NotificationItem => {
  const content = localizeNotificationContent(notification);

  return {
    id: String(notification.id),
    notificationId: notification.id,
    title: content.title,
    description: content.description,
    time: formatRelativeTime(notification.createdAt),
    type: mapNotificationCategory(notification.type),
    unread: !notification.read,
    href: buildNotificationHref(notification, roles),
  };
};

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
  const isNotificationOverride = notificationItemsProp !== undefined;

  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>(
    notificationItemsProp ?? []
  );
  const [unreadCount, setUnreadCount] = useState(() =>
    (notificationItemsProp ?? []).filter((item) => item.unread).length
  );
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState(() => {
    const fallbackName = 'NgÆ°á»i dÃ¹ng';
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

  const avatarInitial = (currentUserDisplayName.trim().charAt(0) || 'A').toUpperCase();

  const refreshNotifications = useCallback(async () => {
    if (isNotificationOverride) {
      return;
    }

    if (!getStoredAuthToken()) {
      setNotificationItems([]);
      setUnreadCount(0);
      return;
    }

    const roles = normalizeRoles(getStoredAuthUser() as { role?: string; roles?: string[] } | null);
    const [listResult, countResult] = await Promise.allSettled([
      listNotifications({ page: 0, size: NOTIFICATIONS_PAGE_SIZE }),
      getUnreadNotificationCount(),
    ]);

    if (listResult.status === 'fulfilled') {
      const items = listResult.value.items.map((item) => toNotificationItem(item, roles));
      setNotificationItems(items);
      if (countResult.status !== 'fulfilled') {
        setUnreadCount(items.filter((item) => item.unread).length);
      }
    }

    if (countResult.status === 'fulfilled') {
      setUnreadCount(countResult.value);
    }
  }, [isNotificationOverride]);

  const refreshPremiumStatus = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setIsPremiumUser(false);
      return;
    }

    try {
      const status = await premiumUpgradeService.getStatus();
      setIsPremiumUser(Boolean(status.premium && status.confirmed));
    } catch {
      setIsPremiumUser(false);
    }
  }, []);

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
    if (isNotificationOverride) {
      setNotificationItems(notificationItemsProp ?? []);
      setUnreadCount((notificationItemsProp ?? []).filter((item) => item.unread).length);
      void refreshPremiumStatus();
      return;
    }

    void refreshNotifications();
    void refreshPremiumStatus();
  }, [isNotificationOverride, notificationItemsProp, refreshNotifications, refreshPremiumStatus]);

  useEffect(() => {
    if (isNotificationOpen) {
      void refreshNotifications();
    }
  }, [isNotificationOpen, refreshNotifications]);

  useEffect(() => {
    function handleAuthUserUpdated() {
      const fallbackName = 'NgÆ°á»i dÃ¹ng';
      const currentUser = getStoredAuthUser() as
        | {
            fullName?: string;
            name?: string;
            email?: string;
            avatarUrl?: string;
            role?: string;
            roles?: string[];
          }
        | null;

      setCurrentUserDisplayName(currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? fallbackName);
      setCurrentUserAvatarUrl(currentUser?.avatarUrl ?? '');
      void refreshNotifications();
      void refreshPremiumStatus();
    }

    window.addEventListener(AUTH_USER_UPDATED_EVENT, handleAuthUserUpdated);
    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, handleAuthUserUpdated);
    };
  }, [refreshNotifications, refreshPremiumStatus]);

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

  async function handleNotificationItemClick(item: NotificationItem) {
    const shouldMarkRead = Boolean(item.notificationId) && Boolean(item.unread);

    if (item.unread) {
      setNotificationItems((prev) =>
        prev.map((notification) =>
          notification.id === item.id ? { ...notification, unread: false } : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsNotificationOpen(false);

    if (shouldMarkRead) {
      try {
        await markNotificationRead(item.notificationId as number);
      } catch {
        // Ignore errors to keep the UI responsive.
      }
    }

    if (item.href) {
      navigate(item.href);
    }
  }

  async function handleMarkAllAsRead() {
    setNotificationItems((prev) =>
      prev.map((item) => ({ ...item, unread: false }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      // Ignore errors to keep the UI responsive.
    }
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
        hidden h-full shrink-0 md:flex md:flex-col
        bg-transparent
        border-r border-[var(--line-soft)]
        transition-all duration-300 ease-in-out
        relative
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      <button
        onClick={toggleSidebar}
        aria-label={isCollapsed ? 'Má»Ÿ rá»™ng sidebar' : 'Thu gá»n sidebar'}
        className="sidebar-toggle-fab absolute top-20 -right-3 w-7 h-7 rounded-full bg-white border border-[rgba(0,0,0,0.08)] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-200 ease-in-out hover:scale-110 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] hover:text-[var(--brand-700)] hover:border-[var(--brand-200)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] z-10"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
            <p className="whitespace-nowrap font-[var(--font-label)] text-[1.45rem] font-semibold tracking-[-0.01em] text-[var(--ink-900)]">
              Scholarly Sanctuary
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
              title={!isExpanded ? 'ThÃ´ng bÃ¡o' : undefined}
              aria-label="Má»Ÿ thÃ´ng bÃ¡o"
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
                      border-2 border-white
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
                ThÃ´ng bÃ¡o
              </span>
            </button>

            {isNotificationOpen ? (
              <NotificationPopover
                items={notificationItems}
                onMarkAllAsRead={handleMarkAllAsRead}
                onItemClick={handleNotificationItemClick}
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
                className={`${isExpanded ? 'h-10 w-10' : 'h-11 w-11'} overflow-hidden rounded-full border-2 bg-[var(--brand-700)] text-center text-sm font-semibold leading-9 text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 ${isAvatarMenuOpen ? 'border-[#D6B76A] shadow-[0_0_0_4px_rgba(214,183,106,0.2),0_10px_24px_rgba(11,59,120,0.28)] scale-105' : isPremiumUser ? 'border-[#D6B76A] shadow-[0_0_0_3px_rgba(214,183,106,0.18)]' : 'border-[var(--brand-100)] hover:brightness-110'}`}
                aria-label="Má»Ÿ menu tÃ i khoáº£n"
                aria-haspopup="menu"
                aria-expanded={isAvatarMenuOpen}
                title={!isExpanded ? 'TÃ i khoáº£n' : undefined}
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
                    <User size={14} /> Xem há»“ sÆ¡
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
                  >
                    <LogOut size={14} /> ÄÄƒng xuáº¥t
                  </button>
                </div>
              ) : null}
            </div>

            {isExpanded && (
              <div className="flex-1 text-left">
                <p className="truncate font-[var(--font-label)] text-xs font-semibold text-[var(--ink-900)]">
                  {currentUserDisplayName}
                </p>
                {isPremiumUser ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#D6B76A] bg-[#FFFCF3] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#B88A20]">
                    <Crown size={10} /> VIP
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/user/premium/upgrade')}
                    className="mt-1 inline-flex items-center rounded-full border border-[#a855f7] bg-white px-3 py-1 text-[10px] font-semibold text-[#7c3aed] transition hover:bg-[#f3e8ff]"
                  >
                    NÃ¢ng cáº¥p
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

