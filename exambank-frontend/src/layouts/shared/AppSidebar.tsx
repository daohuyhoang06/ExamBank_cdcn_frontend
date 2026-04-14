import type { LucideIcon } from "lucide-react";
import { Building2, Headset, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export type SidebarNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

type Props = {
  items: SidebarNavItem[];
  subtitle: string;
  showAdminExtras?: boolean;
};

export function AppSidebar({ items, subtitle, showAdminExtras = false }: Props) {
  const location = useLocation();

  const normalizePath = (path: string): string => {
    if (!path) {
      return "/";
    }
    const normalized = path.replace(/\/+$/, "");
    return normalized.length > 0 ? normalized : "/";
  };

  const currentPath = normalizePath(location.pathname);
  const matchedItemPaths = items
    .map((item) => {
      const targetPath = normalizePath(item.path);
      const depth = targetPath.split("/").filter(Boolean).length;
      const isTopLevelRoot = depth === 1;
      const matches = isTopLevelRoot
        ? currentPath === targetPath
        : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

      return {
        path: item.path,
        targetPath,
        matches,
      };
    })
    .filter((entry) => entry.matches)
    .sort((left, right) => right.targetPath.length - left.targetPath.length);

  const activeItemPath = matchedItemPaths[0]?.path;

  return (
    <aside className="hidden w-64 border-r border-[var(--line-soft)] bg-[#f2f5fa] md:flex md:flex-col">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[linear-gradient(135deg,var(--brand-700)_0%,var(--brand-600)_100%)] p-2.5 text-white shadow-[var(--shadow-brand)]">
            <Building2 size={20} />
          </div>
          <div>
            <p className="whitespace-nowrap font-[var(--font-label)] text-[2.45rem] font-semibold tracking-[0.01em] text-[var(--ink-900)]">
                Scholarly Sanctuar
            </p>
              <p className="-mt-1 inline-block origin-left whitespace-nowrap text-[8px] uppercase leading-none tracking-[0.12em] text-[var(--ink-500)] scale-[0.7]">
                {subtitle}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {items.map((item) => {
          const isActive = activeItemPath === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group mr-3 inline-flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] ${
                isActive
                  ? "translate-x-1 -translate-y-0.5 rounded-r-full bg-white text-[var(--brand-700)] ring-1 ring-[var(--brand-100)] shadow-[0_12px_22px_rgba(16,21,38,0.10)]"
                  : "rounded-xl text-[var(--ink-700)] hover:translate-x-1 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_18px_rgba(16,21,38,0.09)]"
              }`}
            >
              <Icon
                size={16}
                className={`transition-transform duration-200 ${isActive ? "scale-105" : "group-hover:scale-105"}`}
              />
              {item.label}
            </Link>
          );
        })}

        {showAdminExtras ? (
          <>
            <div className="mt-6 rounded-xl border border-[var(--line-soft)] bg-white p-3">
              <p className="inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-[var(--brand-700)]">
                <Headset size={14} />
                Support Portal
              </p>
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ink-600)] transition hover:bg-white"
            >
              <LogOut size={15} />
              Log Out
            </button>
          </>
        ) : null}
      </nav>
    </aside>
  );
}
