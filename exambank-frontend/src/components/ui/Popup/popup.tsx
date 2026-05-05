import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button/button";

export type PopupType = "danger" | "warning" | "success" | "info";

export type PopupProps = {
  open: boolean;
  title: string;
  message: ReactNode | string;
  type?: PopupType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const popupTypeStyles: Record<PopupType, { accent: string; ring: string; icon: ReactNode }> = {
  danger: {
    accent: "from-rose-600 to-red-600",
    ring: "ring-rose-100",
    icon: <AlertTriangle className="text-white" size={22} />,
  },
  warning: {
    accent: "from-amber-500 to-orange-500",
    ring: "ring-amber-100",
    icon: <ShieldAlert className="text-white" size={22} />,
  },
  success: {
    accent: "from-emerald-600 to-green-600",
    ring: "ring-emerald-100",
    icon: <CheckCircle2 className="text-white" size={22} />,
  },
  info: {
    accent: "from-sky-600 to-blue-600",
    ring: "ring-sky-100",
    icon: <Info className="text-white" size={22} />,
  },
};

function renderTextMessage(message: string): ReactNode {
  const lines = message.split(/\r?\n/);

  return (
    <div className="space-y-2">
      {lines.map((line, lineIndex) => {
        const segments: ReactNode[] = [];
        const parts = line.split(/(\*\*[^*]+\*\*)/g);

        parts.forEach((part, partIndex) => {
          if (!part) {
            return;
          }

          const isBold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
          const content = isBold ? part.slice(2, -2) : part;

          segments.push(
            isBold ? (
              <strong key={`${lineIndex}-${partIndex}`} className="font-semibold text-[var(--ink-900)]">
                {content}
              </strong>
            ) : (
              <span key={`${lineIndex}-${partIndex}`}>{content}</span>
            )
          );
        });

        return (
          <p key={lineIndex} className="leading-7 text-[var(--ink-700)]">
            {segments.length > 0 ? segments : <span>&nbsp;</span>}
          </p>
        );
      })}
    </div>
  );
}

export function Popup({
  open,
  title,
  message,
  type = "info",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  showCancel = true,
  confirmLoading = false,
  onConfirm,
  onCancel,
}: PopupProps) {
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  const styles = useMemo(() => popupTypeStyles[type], [type]);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsClosing(false);
      });
      return;
    }

    setIsClosing(true);
    const timer = window.setTimeout(() => setShouldRender(false), 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [onCancel, onConfirm, open]);

  if (!shouldRender) {
    return null;
  }

  const content = typeof message === "string" ? renderTextMessage(message) : message;

  return (
    <div
      className={`fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? "opacity-0" : "opacity-100"}`}
      onClick={onCancel}
      aria-hidden="true"
    >
      <div
        className={`relative w-full max-w-[34rem] rounded-[16px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.24)] ring-1 ${styles.ring} transition-all duration-200 ${isClosing ? "scale-95 opacity-0 translate-y-2" : "scale-100 opacity-100 translate-y-0"}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${styles.accent} shadow-lg`}>
          {styles.icon}
        </div>

        <div className="space-y-3 pr-8">
          <h2 id={titleId} className="text-[1.6rem] font-black tracking-tight text-[var(--ink-900)]">
            {title}
          </h2>

          <div className="text-[0.98rem] text-[var(--ink-700)]">{content}</div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {showCancel ? (
            <Button
              ref={cancelButtonRef}
              type="button"
              variant="secondary"
              className="h-11 rounded-xl px-5"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          ) : null}

          <Button
            ref={showCancel ? confirmButtonRef : cancelButtonRef}
            type="button"
            variant={type === "danger" ? "danger" : type === "success" ? "success" : "primary"}
            className="h-11 rounded-xl px-5"
            onClick={() => void onConfirm()}
            disabled={confirmLoading}
          >
            {confirmLoading ? "Đang xử lý..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}