import type { LucideIcon } from "lucide-react";
import { Building2, Headset } from "lucide-react";
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
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mr-3 inline-flex items-center gap-3 px-4 py-3 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] ${
                isActive
                  ? "rounded-r-full bg-white text-[var(--brand-700)] shadow-[0_8px_16px_rgba(16,21,38,0.07)]"
                  : "rounded-xl text-[var(--ink-700)] hover:translate-x-1 hover:bg-white"
              }`}
            >
              <Icon size={16} />
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
          </>
        ) : null}
      </nav>
    </aside>
  );
}
