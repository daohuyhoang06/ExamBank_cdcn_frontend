import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getStoredAuthUser } from "@/features/auth/services/auth.service";
import { AUTH_USER_UPDATED_EVENT } from "@/features/auth/services/auth.service";

type Props = {
  title?: string;
  subtitle?: string;
};

export function AppHeader({
  title = "Scholarly Sanctuary",
  subtitle = "Xin chào",
}: Props) {
  const location = useLocation();
  const isStudentArea = location.pathname.startsWith("/user");

  const [currentUserDisplayName, setCurrentUserDisplayName] = useState(() => {
    const fallbackName = "Người dùng";
    const currentUser = getStoredAuthUser() as
      | {
          fullName?: string;
          name?: string;
          email?: string;
          coinBalance?: number;
        }
      | null;

    return currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? fallbackName;
  });

  const headerMetaTitle = isStudentArea ? "Tài khoản" : title;
  const headerMetaSubtitle = currentUserDisplayName || subtitle;
  const [coinBalance, setCoinBalance] = useState(() => {
    const currentUser = getStoredAuthUser() as
      | {
          coinBalance?: number;
        }
      | null;
    return typeof currentUser?.coinBalance === "number" ? currentUser.coinBalance : 0;
  });

  useEffect(() => {
    function handleAuthUserUpdated() {
      const fallbackName = "Người dùng";
      const currentUser = getStoredAuthUser() as
        | {
            fullName?: string;
            name?: string;
            email?: string;
            coinBalance?: number;
          }
        | null;

      setCurrentUserDisplayName(currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? fallbackName);
      setCoinBalance(typeof currentUser?.coinBalance === "number" ? currentUser.coinBalance : 0);
    }

    window.addEventListener(AUTH_USER_UPDATED_EVENT, handleAuthUserUpdated);
    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, handleAuthUserUpdated);
    };
  }, []);

  return (
    <header className="relative z-40 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line-soft)] bg-white/88 px-6 py-4 backdrop-blur-xl">
      <div className="text-left">
        <p className="font-[var(--font-label)] text-xs text-[var(--ink-600)]">{headerMetaTitle}</p>
        <p className="font-[var(--font-label)] text-xs font-semibold text-[var(--ink-900)]">
          {headerMetaSubtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {isStudentArea ? (
          <div className="rounded-full border border-[var(--line-soft)] bg-[var(--bg-panel)] px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
            Coin: {coinBalance.toLocaleString("vi-VN")}
          </div>
        ) : null}
        <button
          type="button"
          className="rounded-full border border-transparent p-2 text-[var(--ink-600)] transition duration-200 hover:border-[var(--line-soft)] hover:bg-[var(--bg-page)]"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
