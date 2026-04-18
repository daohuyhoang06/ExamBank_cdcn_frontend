import { Bell } from "lucide-react";

export type NotificationType = "moderation" | "financial" | "system" | "community";

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  unread?: boolean;
  href?: string;
};

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
  items: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onItemClick?: (item: NotificationItem) => void;
  onViewAll?: () => void;
};

export function NotificationPopover({
  items,
  onMarkAllAsRead,
  onItemClick,
  onViewAll,
}: Props) {
  return (
    <div className="absolute bottom-12 right-0 z-30 w-[22rem] overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[#eef0f4] shadow-[var(--shadow-soft)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <h3 className="text-sm font-semibold text-[var(--brand-700)]">
          ThÃƒÂ´ng bÃƒÂ¡o
        </h3>

        <button
          onClick={onMarkAllAsRead}
          className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Ã„ÂÃƒÂ¡nh dÃ¡ÂºÂ¥u Ã„â€˜ÃƒÂ£ Ã„â€˜Ã¡Â»Âc
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[22rem] overflow-y-auto px-2 pb-2">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--ink-700)]">
              ChÃ†Â°a cÃƒÂ³ thÃƒÂ´ng bÃƒÂ¡o
            </p>
            <p className="mt-1 text-xs text-[var(--ink-500)]">
              CÃƒÂ¡c cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t mÃ¡Â»â€ºi sÃ¡ÂºÂ½ hiÃ¡Â»Æ’n thÃ¡Â»â€¹ tÃ¡ÂºÂ¡i Ã„â€˜ÃƒÂ¢y
            </p>
          </div>
        ) : (
          items.map((item) => {
            const style = notificationTypeStyles[item.type];

            return (
              <article
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className="mb-1.5 cursor-pointer rounded-xl bg-white/80 px-3 py-2.5 transition hover:bg-white"
              >
                <div className="flex gap-2.5">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${style.icon}`}
                  >
                    <Bell size={12} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--ink-900)] line-clamp-2">
                        {item.title}
                      </p>

                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase ${style.badge}`}
                        >
                          {style.label}
                        </span>

                        {item.unread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-700" />
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--ink-600)] line-clamp-2">
                      {item.description}
                    </p>

                    <p className="mt-1 text-[10px] text-[var(--ink-500)]">
                      {item.time}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 pt-1">
        <button
          onClick={onViewAll}
          className="w-full rounded-lg bg-[var(--brand-700)] px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
        >
          Xem tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£
        </button>
      </div>
    </div>
  );
}
