import { Flame, Settings } from "lucide-react";
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
          streak?: number;
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
  const [streak, setStreak] = useState(() => {
    const currentUser = getStoredAuthUser() as
      | {
          streak?: number;
        }
      | null;
    return typeof currentUser?.streak === "number" ? currentUser.streak : 0;
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
            streak?: number;
          }
        | null;

      setCurrentUserDisplayName(currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? fallbackName);
      setCoinBalance(typeof currentUser?.coinBalance === "number" ? currentUser.coinBalance : 0);
      setStreak(typeof currentUser?.streak === "number" ? currentUser.streak : 0);
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
          <>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <Flame size={14} fill="currentColor" />
              {streak.toLocaleString("vi-VN")} ngày
            </div>
            <div className="rounded-full border border-[var(--line-soft)] bg-[var(--bg-panel)] px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
              Coin: {coinBalance.toLocaleString("vi-VN")}
            </div>
          </>
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
