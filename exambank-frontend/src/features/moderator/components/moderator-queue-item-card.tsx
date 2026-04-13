import { FileText } from "lucide-react";
import type { ModeratorQueueRecord } from "@/features/moderator/services/moderator-queue.service";
import defaultQueueThumbnail from "@/assets/default-queue-thumbnail.svg";

type ModeratorQueueItemCardProps = {
  item: ModeratorQueueRecord;
  active: boolean;
  onSelect: (id: string) => void;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// eslint-disable-next-line react-refresh/only-export-components
export function statusLabel(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "APPROVED") return "APPROVED";
  if (normalized === "REJECTED") return "REJECTED";
  if (normalized === "PENDING_REVIEW") return "PENDING REVIEW";
  if (normalized === "TRANSFORMED") return "TRANSFORMED";

  return "PENDING";
}

function statusClassName(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "APPROVED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (normalized === "REJECTED") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  }

  if (normalized === "PENDING_REVIEW") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }

  if (normalized === "TRANSFORMED") {
    return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function badgeBaseClassName() {
  return "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]";
}

export function ModeratorQueueItemCard({
  item,
  active,
  onSelect,
}: ModeratorQueueItemCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={[
        "group w-full rounded-[22px] border p-3 text-left transition-all duration-200",
        active
          ? "border-[#d8e3f8] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
          : "border-[#edf1f7] bg-white hover:border-[#dfe7f3] hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)]",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <div className="relative flex h-[100px] w-[82px] shrink-0 items-center justify-center rounded-[16px] bg-[#f5f7fb] ring-1 ring-[#edf1f6]">
          <img
            src={defaultQueueThumbnail}
            alt="Ảnh mặc định tài liệu"
            className="h-[96px] w-[76px] rounded-[12px] object-cover"
            loading="lazy"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex text-[11px] font-bold uppercase tracking-[0.08em] text-[#1a4b84]">
              {item.subject}
            </span>

            <span className="text-[10px] font-semibold tracking-[0.08em] text-slate-400">
              {item.uploadedAt}
            </span>
          </div>

          <h3 className="line-clamp-2 text-[19px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1f2b3d]">
            {item.title}
          </h3>

          <span className="mt-1.5 inline-flex items-center gap-1.5 truncate text-[11px] font-medium text-slate-400">
            Người đăng:
            <span className="font-semibold text-slate-900">{item.uploader}</span>
          </span>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] text-slate-400">
              <FileText size={12} className="text-slate-400" strokeWidth={2.2} />
              {item.fileType}
            </span>

            <span
              className={[
                badgeBaseClassName(),
                "ml-auto shrink-0 font-bold uppercase",
                statusClassName(item.status),
              ].join(" ")}
            >
              {statusLabel(item.status)}
            </span>
          </div>

          {item.moderatorNote ? (
            <p className="mt-2 line-clamp-1 text-[12px] font-medium text-amber-700">
              Ghi chú: {item.moderatorNote}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

