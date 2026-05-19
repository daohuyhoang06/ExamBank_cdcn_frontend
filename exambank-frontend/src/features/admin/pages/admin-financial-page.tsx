import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { adminPremiumOrdersService } from "@/features/admin/services/admin-premium-orders.service";
import type { AdminPremiumOrder } from "@/features/admin/types/admin-premium-order.type";

type FilterStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ALL";

const formatDateTime = (value?: string): string => {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatVnd = (value: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function AdminFinancialPage() {
  const [items, setItems] = useState<AdminPremiumOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("PENDING_REVIEW");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [noteByOrderId, setNoteByOrderId] = useState<Record<number, string>>({});

  const load = async (status: FilterStatus) => {
    setBusy(true);
    setError("");
    try {
      const next = await adminPremiumOrdersService.list(status === "ALL" ? undefined : status);
      setItems(next);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tải danh sách đơn premium."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load(filterStatus);
  }, [filterStatus]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "PENDING_REVIEW").length,
    [items]
  );

  const approve = async (orderId: number) => {
    setBusy(true);
    setError("");
    try {
      await adminPremiumOrdersService.approve(orderId);
      await load(filterStatus);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Duyệt đơn premium thất bại."));
      setBusy(false);
    }
  };

  const reject = async (orderId: number) => {
    setBusy(true);
    setError("");
    try {
      const note = (noteByOrderId[orderId] ?? "").trim();
      await adminPremiumOrdersService.reject(orderId, note);
      await load(filterStatus);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Từ chối đơn premium thất bại."));
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Premium Payment Review</h1>
            <p className="mt-1 text-sm text-slate-600">
              Quản lý luồng nâng cấp premium và duyệt bill thanh toán từ người dùng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(filterStatus)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw size={14} />
            Làm mới
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Đơn chờ duyệt trong danh sách hiện tại: <span className="font-semibold">{pendingCount}</span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["PENDING_REVIEW", "APPROVED", "REJECTED", "ALL"] as FilterStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                filterStatus === status
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Order #{item.id}</span> - {item.status}
                </p>
                <p>
                  User: <span className="font-semibold">{item.userName ?? "N/A"}</span> ({item.userEmail ?? "N/A"})
                </p>
                <p>
                  Plan: <span className="font-semibold">{item.planName}</span> - {formatVnd(item.planPrice)}
                </p>
                <p>Nội dung CK: <span className="font-mono text-slate-900">{item.transferContent}</span></p>
                <p>Thời gian xác nhận CK: <span className="font-semibold">{formatDateTime(item.transferConfirmedAt)}</span></p>
                <p>Upload bill lúc: <span className="font-semibold">{formatDateTime(item.billUploadedAt)}</span></p>
                {item.reviewedByName ? (
                  <p>
                    Duyệt bởi: <span className="font-semibold">{item.reviewedByName}</span> lúc{" "}
                    <span className="font-semibold">{formatDateTime(item.reviewedAt)}</span>
                  </p>
                ) : null}
                {item.adminNote ? (
                  <p>
                    Ghi chú admin: <span className="font-semibold">{item.adminNote}</span>
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                {item.billImageUrl ? (
                  <a href={item.billImageUrl} target="_blank" rel="noreferrer">
                    <img
                      src={item.billImageUrl}
                      alt={`Bill order ${item.id}`}
                      className="h-52 w-full rounded-lg border border-slate-200 object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
                    Chưa có bill
                  </div>
                )}

                {item.status === "PENDING_REVIEW" ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteByOrderId[item.id] ?? ""}
                      onChange={(event) =>
                        setNoteByOrderId((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      placeholder="Ghi chú khi từ chối (tuỳ chọn)"
                      className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void approve(item.id)}
                        disabled={busy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} />
                        Duyệt premium
                      </button>
                      <button
                        type="button"
                        onClick={() => void reject(item.id)}
                        disabled={busy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        <XCircle size={14} />
                        Từ chối
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
