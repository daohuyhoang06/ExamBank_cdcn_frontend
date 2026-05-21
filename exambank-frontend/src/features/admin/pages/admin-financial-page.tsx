import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  Filter,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import { alert as showAlert, confirm } from "@/lib/dialog";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { adminPremiumOrdersService } from "@/features/admin/services/admin-premium-orders.service";
import type { AdminPremiumOrder } from "@/features/admin/types/admin-premium-order.type";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

type FinancialStat = {
  title: string;
  value: string;
  hint: string;
  badge: string;
  tone: "primary" | "warning" | "success" | "secondary";
};

const pageSize = 6;

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveOrderDate(order: AdminPremiumOrder) {
  return (
    parseDate(order.reviewedAt) ??
    parseDate(order.transferConfirmedAt) ??
    parseDate(order.billUploadedAt) ??
    parseDate(order.createdAt) ??
    parseDate(order.updatedAt)
  );
}

function isWithinLastDays(value: Date | null, days: number) {
  if (!value) {
    return false;
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(now.getDate() - days);
  threshold.setHours(0, 0, 0, 0);

  return value.getTime() >= threshold.getTime();
}

function getOrderStatusGroup(status: AdminPremiumOrder["status"]): Exclude<FilterStatus, "all"> {
  if (status === "APPROVED") {
    return "approved";
  }

  if (status === "REJECTED") {
    return "rejected";
  }

  return "pending";
}

function getOrderStatusMeta(status: AdminPremiumOrder["status"]) {
  if (status === "APPROVED") {
    return {
      label: "APPROVED",
      tone: "success" as const,
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "REJECTED") {
    return {
      label: "REJECTED",
      tone: "danger" as const,
      className: "bg-rose-100 text-rose-700",
    };
  }

  if (status === "TRANSFER_CONFIRMED") {
    return {
      label: "TRANSFER_CONFIRMED",
      tone: "primary" as const,
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (status === "CREATED") {
    return {
      label: "CREATED",
      tone: "primary" as const,
      className: "bg-slate-100 text-slate-700",
    };
  }

  return {
    label: "PENDING_REVIEW",
    tone: "warning" as const,
    className: "bg-amber-100 text-amber-800",
  };
}

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function buildStats(orders: AdminPremiumOrder[]): FinancialStat[] {
  const approvedOrders = orders.filter((order) => order.status === "APPROVED");
  const pendingOrders = orders.filter((order) => getOrderStatusGroup(order.status) === "pending");
  const rejectedOrders = orders.filter((order) => order.status === "REJECTED");
  const revenue = approvedOrders.reduce((sum, order) => sum + (order.planPrice ?? 0), 0);
  const approvedInLastWeek = approvedOrders.filter((order) => isWithinLastDays(resolveOrderDate(order), 7)).length;
  const conversionRate = orders.length > 0 ? (approvedOrders.length / orders.length) * 100 : 0;

  return [
    {
      title: "Tổng doanh thu",
      value: formatCurrency(revenue),
      hint: `${formatNumber(approvedOrders.length)} đơn đã duyệt`,
      badge: "VND",
      tone: "primary",
    },
    {
      title: "Chờ duyệt",
      value: formatNumber(pendingOrders.length),
      hint: "Cần xử lý",
      badge: "Theo dõi",
      tone: "warning",
    },
    {
      title: "Premium mới",
      value: formatNumber(approvedInLastWeek),
      hint: "Được duyệt trong 7 ngày gần đây",
      badge: "7 ngày",
      tone: "success",
    },
    {
      title: "Tỷ lệ chuyển đổi",
      value: `${conversionRate.toFixed(1)}%`,
      hint: `${formatNumber(rejectedOrders.length)} đơn bị từ chối`,
      badge: "Hiệu suất",
      tone: "secondary",
    },
  ];
}

function statToneClasses(tone: FinancialStat["tone"]) {
  if (tone === "warning") {
    return {
      card: "border-amber-100 bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
      badge: "bg-amber-100 text-amber-800",
      value: "text-amber-900",
    };
  }

  if (tone === "success") {
    return {
      card: "border-emerald-100 bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-800",
    };
  }

  if (tone === "secondary") {
    return {
      card: "border-slate-200 bg-slate-50",
      icon: "bg-slate-200 text-slate-700",
      badge: "bg-white text-slate-700",
      value: "text-slate-900",
    };
  }

  return {
    card: "border-[var(--line-soft)] bg-white",
    icon: "bg-[var(--brand-100)] text-[var(--brand-700)]",
    badge: "bg-[var(--accent-100)] text-[var(--accent-500)]",
    value: "text-[var(--brand-700)]",
  };
}

function buildCsv(rows: AdminPremiumOrder[]) {
  const header = [
    "Order ID",
    "User Name",
    "User Email",
    "Plan Name",
    "Plan Duration Days",
    "Amount VND",
    "Status",
    "Transfer Content",
    "Transfer Confirmed At",
    "Bill Uploaded At",
    "Reviewed By",
    "Reviewed At",
    "Admin Note",
  ];

  const body = rows.map((row) => [
    row.id,
    row.userName ?? "",
    row.userEmail ?? "",
    row.planName,
    row.planDurationDays,
    row.planPrice,
    row.status,
    row.transferContent,
    row.transferConfirmedAt ?? "",
    row.billUploadedAt ?? "",
    row.reviewedByName ?? "",
    row.reviewedAt ?? "",
    row.adminNote ?? "",
  ]);

  const toCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

  return [header, ...body].map((row) => row.map(toCell).join(",")).join("\n");
}

export default function AdminFinancialPage() {
  const [orders, setOrders] = useState<AdminPremiumOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const next = await adminPremiumOrdersService.list();
      setOrders(next);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tải danh sách đơn premium."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const stats = useMemo(() => buildStats(orders), [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (filterStatus !== "all" && getOrderStatusGroup(order.status) !== filterStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        String(order.id),
        order.userName ?? "",
        order.userEmail ?? "",
        order.planName,
        order.transferContent,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [filterStatus, orders, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = async () => {
    if (filteredOrders.length === 0) {
      await showAlert("Không có dữ liệu để xuất.");
      return;
    }

    const csv = buildCsv(filteredOrders);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `admin-financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = async (order: AdminPremiumOrder) => {
    if (processingOrderId !== null) {
      return;
    }

    const accepted = await confirm(`Duyệt đơn premium #${order.id} của ${order.userName ?? "người dùng này"}?`, {
      title: "Duyệt đơn premium",
      type: "success",
      confirmText: "Duyệt",
      cancelText: "Hủy",
    });

    if (!accepted) {
      return;
    }

    setProcessingOrderId(order.id);

    try {
      await adminPremiumOrdersService.approve(order.id);
      await loadOrders();
      await showAlert("Đã duyệt đơn premium thành công.", {
        title: "Hoàn tất",
        type: "success",
      });
    } catch (err) {
      await showAlert(extractApiErrorMessage(err, "Duyệt đơn premium thất bại."), {
        title: "Lỗi",
        type: "danger",
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleReject = async (order: AdminPremiumOrder) => {
    if (processingOrderId !== null) {
      return;
    }

    const accepted = await confirm(`Từ chối đơn premium #${order.id}?`, {
      title: "Từ chối đơn premium",
      type: "danger",
      confirmText: "Từ chối",
      cancelText: "Hủy",
    });

    if (!accepted) {
      return;
    }

    setProcessingOrderId(order.id);

    try {
      await adminPremiumOrdersService.reject(order.id, "");
      await loadOrders();
      await showAlert("Đã từ chối đơn premium.", {
        title: "Hoàn tất",
        type: "info",
      });
    } catch (err) {
      await showAlert(extractApiErrorMessage(err, "Từ chối đơn premium thất bại."), {
        title: "Lỗi",
        type: "danger",
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--ink-900)]">
            Tài chính
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-600)]">
            Theo dõi doanh thu, duyệt đăng ký premium và quản lý toàn bộ luồng thanh toán nâng cấp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            leftIcon={<Download size={16} />}
            className="rounded-xl"
            onClick={() => void handleExport()}
          >
            Xuất báo cáo
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            leftIcon={<RefreshCcw size={16} />}
            className="rounded-xl"
            onClick={() => void loadOrders()}
            disabled={loading || processingOrderId !== null}
          >
            Làm mới
          </Button>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const tone = statToneClasses(item.tone);
          const icon =
            item.tone === "warning" ? (
              <Clock3 size={18} />
            ) : item.tone === "success" ? (
              <ShieldCheck size={18} />
            ) : item.tone === "secondary" ? (
              <TrendingUp size={18} />
            ) : (
              <CircleDollarSign size={18} />
            );

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              subtitle={item.hint}
              badge={item.badge}
              icon={icon}
              cardClassName={`border shadow-[var(--shadow-soft)] ${tone.card}`}
              iconWrapClassName={tone.icon}
              badgeClassName={tone.badge}
              valueClassName={tone.value}
            />
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 border-b border-[var(--line-soft)] bg-[var(--bg-soft)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              <h2 className="font-[var(--font-label)] text-base font-bold text-[var(--ink-900)]">
                Danh sách đăng ký premium
              </h2>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-600)]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {formatNumber(filteredOrders.length)} đơn
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[260px] flex-1 sm:max-w-[360px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm tên người dùng, email, mã đơn..."
                className="w-full rounded-xl border border-[var(--line-soft)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--ink-700)] outline-none transition placeholder:text-[var(--ink-400)] focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
              />
            </label>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
              }}
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
            >
              <Filter size={16} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-left">
            <thead>
              <tr className="bg-[var(--bg-soft)] text-[0.68rem] uppercase tracking-[0.12em] text-[var(--ink-600)]">
                <th className="px-6 py-3 font-bold">Tài khoản đăng ký</th>
                <th className="px-6 py-3 font-bold">Gói nâng cấp</th>
                <th className="px-6 py-3 font-bold">Số tiền</th>
                <th className="px-6 py-3 font-bold">Start Time</th>
                <th className="px-6 py-3 font-bold">End Time</th>
                <th className="px-6 py-3 font-bold">Trạng thái</th>
                <th className="px-6 py-3 font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-[var(--line-soft)]/70">
                  <td className="px-6 py-8 text-sm text-[var(--ink-600)]" colSpan={7}>
                    Đang tải dữ liệu tài chính...
                  </td>
                </tr>
              ) : pagedOrders.length > 0 ? (
                pagedOrders.map((order) => {
                  const status = getOrderStatusMeta(order.status);
                  const isPending = getOrderStatusGroup(order.status) === "pending";
                  const isProcessing = processingOrderId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="border-t border-[var(--line-soft)]/70 align-top transition hover:bg-[var(--bg-soft)]/60"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-100)] text-xs font-bold text-[var(--brand-700)]">
                            {getInitials(order.userName, order.userEmail)}
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-[var(--ink-900)]">
                              {order.userName ?? "Người dùng chưa xác định"}
                            </p>
                            <p className="mt-1 break-words text-xs text-[var(--ink-600)]">
                              {order.userEmail ?? "Không có email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[var(--ink-900)]">{order.planName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-[var(--ink-900)]">{formatCurrency(order.planPrice)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--ink-900)]">
                        {isPending ? "--" : formatDateTime(order.startedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--ink-900)]">
                        {isPending ? "--" : formatDateTime(order.expiresAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] ${status.className}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {order.billImageUrl ? (
                            <a
                              href={order.billImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line-soft)] bg-white text-[var(--ink-600)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--brand-700)]"
                              title="Xem bill"
                            >
                              <Eye size={16} />
                            </a>
                          ) : (
                            <span className="text-sm text-[var(--ink-400)]">--</span>
                          )}
                          {isPending ? (
                            <>
                              <Button
                                type="button"
                                variant="success"
                                size="sm"
                                leftIcon={<CheckCircle2 size={14} />}
                                onClick={() => void handleApprove(order)}
                                disabled={isProcessing || processingOrderId !== null}
                                className="rounded-lg"
                              >
                                {isProcessing ? "Đang duyệt..." : "Duyệt"}
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                leftIcon={<XCircle size={14} />}
                                onClick={() => void handleReject(order)}
                                disabled={isProcessing || processingOrderId !== null}
                                className="rounded-lg"
                              >
                                {isProcessing ? "Đang xử lý..." : "Từ chối"}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-t border-[var(--line-soft)]/70">
                  <td className="px-6 py-8 text-sm text-[var(--ink-600)]" colSpan={7}>
                    Không có đơn premium phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 sm:flex-row">
          <p className="text-sm text-[var(--ink-600)]">
            Hiển thị {formatNumber(filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1)} -{" "}
            {formatNumber(Math.min(filteredOrders.length, currentPage * pageSize))} trong tổng số{" "}
            {formatNumber(filteredOrders.length)} đơn premium
          </p>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </section>
    </div>
  );
}
