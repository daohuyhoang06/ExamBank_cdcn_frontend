import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastConfig = {
  title: string;
  message: string;
  type: ToastType;
  duration?: number;
  showProgress?: boolean;
  actionText?: string;
  onAction?: () => void;
  closable?: boolean;
  badgeText?: string;
};

type InternalToast = {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  duration: number;
  showProgress: boolean;
  actionText?: string;
  onAction?: () => void;
  closable: boolean;
  badgeText?: string;
  paused: boolean;
  closing: boolean;
};

type ToastPresetInput = Omit<ToastConfig, "type">;

type ToastApi = {
  show: (config: ToastConfig) => string;
  success: (config: ToastPresetInput) => string;
  error: (config: ToastPresetInput) => string;
  warning: (config: ToastPresetInput) => string;
  info: (config: ToastPresetInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

type TimerState = {
  timeoutId: number | null;
  startedAt: number;
  remaining: number;
};

const CLOSE_ANIMATION_MS = 220;

const defaultDurationByType: Record<ToastType, number> = {
  success: 3600,
  error: 6200,
  warning: 5200,
  info: 4200,
};

const defaultShowProgressByType: Record<ToastType, boolean> = {
  success: true,
  error: false,
  warning: true,
  info: true,
};

const defaultClosableByType: Record<ToastType, boolean> = {
  success: true,
  error: true,
  warning: true,
  info: true,
};

const toneByType: Record<
  ToastType,
  {
    icon: ReactNode;
    iconWrap: string;
    accent: string;
    action: string;
    border: string;
    bg: string;
  }
> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    iconWrap: "text-emerald-600 bg-emerald-50",
    accent: "bg-emerald-500",
    action: "text-emerald-700 hover:text-emerald-800",
    border: "border-emerald-100",
    bg: "bg-white",
  },
  error: {
    icon: <AlertCircle size={18} />,
    iconWrap: "text-rose-600 bg-rose-50",
    accent: "bg-rose-500",
    action: "text-rose-700 hover:text-rose-800",
    border: "border-rose-100",
    bg: "bg-white",
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    iconWrap: "text-amber-600 bg-amber-50",
    accent: "bg-amber-500",
    action: "text-amber-700 hover:text-amber-800",
    border: "border-amber-100",
    bg: "bg-white",
  },
  info: {
    icon: <Info size={18} />,
    iconWrap: "text-sky-600 bg-sky-50",
    accent: "bg-sky-500",
    action: "text-sky-700 hover:text-sky-800",
    border: "border-sky-100",
    bg: "bg-white",
  },
};

const ToastContext = createContext<ToastApi | null>(null);

let externalToastApi: ToastApi | null = null;

function normalizeToastConfig(config: ToastConfig, id: string): InternalToast {
  return {
    id,
    title: config.title,
    message: config.message,
    type: config.type,
    duration: config.duration ?? defaultDurationByType[config.type],
    showProgress: config.showProgress ?? defaultShowProgressByType[config.type],
    actionText: config.actionText,
    onAction: config.onAction,
    closable: config.closable ?? defaultClosableByType[config.type],
    badgeText: config.badgeText,
    paused: false,
    closing: false,
  };
}

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume,
}: {
  toast: InternalToast;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const [isEntered, setIsEntered] = useState(false);
  const tone = toneByType[toast.type];

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setIsEntered(true);
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const visible = isEntered && !toast.closing;

  return (
    <div
      className={`pointer-events-auto relative w-[min(92vw,26rem)] overflow-hidden rounded-2xl border ${tone.border} ${tone.bg} p-3.5 shadow-[0_14px_32px_rgba(15,23,42,0.12)] transition-all duration-200 ${visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      role="status"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.iconWrap}`}>
          {tone.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{toast.title}</p>
            {toast.badgeText ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {toast.badgeText}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 pr-2 text-sm leading-6 text-slate-600">{toast.message}</p>

          {toast.actionText && toast.onAction ? (
            <button
              type="button"
              className={`mt-2 inline-flex items-center rounded-md text-xs font-semibold transition ${tone.action}`}
              onClick={() => {
                toast.onAction?.();
                onDismiss();
              }}
            >
              {toast.actionText}
            </button>
          ) : null}
        </div>

        {toast.closable ? (
          <button
            type="button"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={onDismiss}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {toast.showProgress ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full origin-left ${tone.accent}`}
            style={{
              animationName: "toast-progress-shrink",
              animationDuration: `${toast.duration}ms`,
              animationTimingFunction: "linear",
              animationFillMode: "forwards",
              animationPlayState: toast.paused ? "paused" : "running",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<InternalToast[]>([]);
  const toastsRef = useRef<InternalToast[]>([]);
  const timersRef = useRef<Map<string, TimerState>>(new Map());

  const clearDismissTimer = useCallback((id: string) => {
    const current = timersRef.current.get(id);
    if (!current || current.timeoutId === null) {
      return;
    }

    window.clearTimeout(current.timeoutId);
    timersRef.current.set(id, {
      ...current,
      timeoutId: null,
    });
  }, []);

  const removeToastImmediately = useCallback(
    (id: string) => {
      clearDismissTimer(id);
      timersRef.current.delete(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
    },
    [clearDismissTimer]
  );

  const requestDismiss = useCallback(
    (id: string) => {
      clearDismissTimer(id);

      setToasts((prev) => {
        if (!prev.some((item) => item.id === id && !item.closing)) {
          return prev;
        }

        return prev.map((item) =>
          item.id === id
            ? {
                ...item,
                closing: true,
                paused: false,
              }
            : item
        );
      });

      window.setTimeout(() => {
        removeToastImmediately(id);
      }, CLOSE_ANIMATION_MS);
    },
    [clearDismissTimer, removeToastImmediately]
  );

  const scheduleDismiss = useCallback(
    (id: string, delay: number) => {
      if (delay <= 0) {
        return;
      }

      clearDismissTimer(id);

      const timeoutId = window.setTimeout(() => {
        requestDismiss(id);
      }, delay);

      timersRef.current.set(id, {
        timeoutId,
        startedAt: Date.now(),
        remaining: delay,
      });
    },
    [clearDismissTimer, requestDismiss]
  );

  const pauseDismiss = useCallback(
    (id: string) => {
      const current = timersRef.current.get(id);
      if (!current || current.timeoutId === null) {
        return;
      }

      const elapsed = Date.now() - current.startedAt;
      const remaining = Math.max(0, current.remaining - elapsed);

      window.clearTimeout(current.timeoutId);
      timersRef.current.set(id, {
        timeoutId: null,
        startedAt: current.startedAt,
        remaining,
      });

      setToasts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, paused: true } : item))
      );
    },
    []
  );

  const resumeDismiss = useCallback(
    (id: string) => {
      const current = timersRef.current.get(id);
      if (!current) {
        return;
      }

      setToasts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, paused: false } : item))
      );

      if (current.remaining <= 0) {
        requestDismiss(id);
        return;
      }

      scheduleDismiss(id, current.remaining);
    },
    [requestDismiss, scheduleDismiss]
  );

  const show = useCallback(
    (config: ToastConfig) => {
      const id = createToastId();
      const normalized = normalizeToastConfig(config, id);

      setToasts((prev) => [normalized, ...prev]);
      if (normalized.duration > 0) {
        scheduleDismiss(id, normalized.duration);
      }

      return id;
    },
    [scheduleDismiss]
  );

  const dismiss = useCallback(
    (id: string) => {
      requestDismiss(id);
    },
    [requestDismiss]
  );

  const dismissAll = useCallback(() => {
    toastsRef.current.forEach((item) => requestDismiss(item.id));
  }, [requestDismiss]);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (config) => show({ ...config, type: "success" }),
      error: (config) => show({ ...config, type: "error" }),
      warning: (config) => show({ ...config, type: "warning" }),
      info: (config) => show({ ...config, type: "info" }),
      dismiss,
      dismissAll,
    }),
    [dismiss, dismissAll, show]
  );

  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  useEffect(() => {
    externalToastApi = api;

    return () => {
      externalToastApi = null;
      timersRef.current.forEach((timer) => {
        if (timer.timeoutId !== null) {
          window.clearTimeout(timer.timeoutId);
        }
      });
      timersRef.current.clear();
    };
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[1200] flex w-auto flex-col gap-2.5 sm:right-6 sm:top-24">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
            onPause={() => pauseDismiss(toast.id)}
            onResume={() => resumeDismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

export const toast = {
  show(config: ToastConfig) {
    return externalToastApi?.show(config) ?? "";
  },
  success(config: ToastPresetInput) {
    return externalToastApi?.success(config) ?? "";
  },
  error(config: ToastPresetInput) {
    return externalToastApi?.error(config) ?? "";
  },
  warning(config: ToastPresetInput) {
    return externalToastApi?.warning(config) ?? "";
  },
  info(config: ToastPresetInput) {
    return externalToastApi?.info(config) ?? "";
  },
  dismiss(id: string) {
    externalToastApi?.dismiss(id);
  },
  dismissAll() {
    externalToastApi?.dismissAll();
  },
};
