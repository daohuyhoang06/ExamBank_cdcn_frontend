import { useEffect, useMemo, useRef, useState } from "react";
import { Award, BarChart3, Check, CheckCircle2, Copy, Crown, ImageUp, Sparkles, Zap } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { premiumUpgradeService } from "@/features/user/services/premium-upgrade.service";
import type { PremiumPlan, PremiumStatus, PremiumUpgradeOrder } from "@/features/user/types/premium-upgrade.type";
import { useToast } from "@/components/ui/Toast/toast-system";
import { getStoredAuthToken } from "@/lib/api-client";

const PENDING_REVIEW_TEXT =
  "Đơn hàng của bạn đang được xử lý, hệ thống sẽ phản hồi sớm nhất (thường trong ngày).";

const formatVnd = (value: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDateTime = (value?: string): string => {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
};

const formatDate = (value?: string): string => {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  }).format(parsed);
};

const premiumBenefits = [
  { icon: Sparkles, text: "Ưu tiên hỗ trợ và cập nhật tính năng mới." },
  { icon: Zap, text: "Trải nghiệm giao diện và quy trình nâng cao." },
  { icon: BarChart3, text: "Thống kê học tập nâng cao và quản lý tiến độ." },
];

const premiumActiveBenefits = [
  {
    title: "Trải nghiệm nâng cao",
    description: "Giao diện và quy trình được tối ưu.",
  },
  {
    title: "Ưu tiên hỗ trợ",
    description: "Cập nhật tính năng mới.",
  },
  {
    title: "Thống kê học tập nâng cao",
    description: "Quản lý tiến độ.",
  },
];

export default function PremiumUpgradePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const exitTimerRef = useRef<number | null>(null);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [order, setOrder] = useState<PremiumUpgradeOrder | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [billFile, setBillFile] = useState<File | null>(null);
  const [busyAction, setBusyAction] = useState<"create" | "confirm" | "upload" | "load" | "">("load");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const pendingReviewDurationMs = 4200;

  const activePlan = useMemo(() => {
    if (!selectedPlanCode) {
      return plans[0] ?? null;
    }
    return plans.find((plan) => plan.code === selectedPlanCode) ?? plans[0] ?? null;
  }, [plans, selectedPlanCode]);

  const planChoices = useMemo(() => {
    const monthly = plans.find((plan) => plan.code === "VIP_MONTHLY");
    const yearly = plans.find((plan) => plan.code === "VIP_YEARLY");

    if (monthly && yearly) {
      return [monthly, yearly];
    }

    return plans;
  }, [plans]);

  const shownOrder = order;
  const shownQrImage = shownOrder?.qrCodeImageUrl ?? "";
  const shownTransferContent = shownOrder?.transferContent || "NAP-PREMIUM-DEMO";
  const shownAmount = shownOrder?.planPrice ?? activePlan?.price ?? 0;
  const shownPlanName = shownOrder?.planName ?? activePlan?.name ?? "VIP";

  const isPremiumActive = Boolean(premiumStatus?.premium && premiumStatus?.confirmed);
  const forceUpgradeView = searchParams.get("view") === "upgrade";
  const currentPlanName =
    premiumStatus?.planName ?? shownOrder?.planName ?? activePlan?.name ?? "VIP";
  const currentPlanCode =
    premiumStatus?.planCode ?? shownOrder?.planCode ?? activePlan?.code ?? "";
  const currentPlanPrice = shownOrder?.planPrice ?? activePlan?.price ?? 0;
  const planStartedAt = premiumStatus?.startedAt ?? shownOrder?.startedAt ?? shownOrder?.createdAt;
  const planExpiresAt = premiumStatus?.expiresAt ?? shownOrder?.expiresAt;
  const nextPaymentAt = planExpiresAt;

  const loadData = async () => {
    setBusyAction("load");
    setError("");

    try {
      const token = getStoredAuthToken();
      const loadedPlans = await premiumUpgradeService.getPlans();
      const [latestOrder, status] = token
        ? await Promise.all([
            premiumUpgradeService.getMyLatestOrder(),
            premiumUpgradeService.getStatus(),
          ])
        : [null, null];

      setPlans(loadedPlans);
      setOrder(latestOrder);
      setPremiumStatus(status);

      if (!selectedPlanCode && loadedPlans.length > 0) {
        const monthly = loadedPlans.find((plan) => plan.code === "VIP_MONTHLY");
        setSelectedPlanCode((monthly ?? loadedPlans[0]).code);
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tải thông tin nâng cấp premium."));
    } finally {
      setBusyAction("");
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const createOrder = async () => {
    if (!activePlan) {
      setError("Chưa có gói premium khả dụng.");
      return;
    }

    setBusyAction("create");
    setError("");
    setInfo("");

    try {
      const created = await premiumUpgradeService.createOrder(activePlan.code);
      setOrder(created);
      setInfo("Đã tạo yêu cầu nâng cấp premium. Vui lòng chuyển khoản theo mã QR.");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tạo yêu cầu nâng cấp."));
    } finally {
      setBusyAction("");
    }
  };

  const confirmTransfer = async () => {
    if (!order) {
      return;
    }

    setBusyAction("confirm");
    setError("");
    setInfo("");

    try {
      const updated = await premiumUpgradeService.confirmTransfer(order.id);
      setOrder(updated);
      setInfo("Đã xác nhận chuyển khoản. Vui lòng tải ảnh bill để hệ thống duyệt.");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể xác nhận chuyển khoản."));
    } finally {
      setBusyAction("");
    }
  };

  const uploadBill = async () => {
    if (!order) {
      setError("Vui lòng tạo yêu cầu nâng cấp trước.");
      return;
    }

    if (order.status !== "TRANSFER_CONFIRMED") {
      setError("Vui lòng xác nhận đã chuyển khoản trước khi gửi bill.");
      return;
    }

    if (!billFile) {
      setError("Vui lòng chọn ảnh bill trước khi gửi.");
      return;
    }

    setBusyAction("upload");
    setError("");
    setInfo("");

    try {
      const updated = await premiumUpgradeService.uploadBill(order.id, billFile);
      setOrder(updated);
      setBillFile(null);
      toast.info({
        title: "Đã gửi bill",
        message: PENDING_REVIEW_TEXT,
        duration: pendingReviewDurationMs,
      });
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
      exitTimerRef.current = window.setTimeout(() => {
        navigate("/user");
      }, pendingReviewDurationMs);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tải ảnh bill."));
    } finally {
      setBusyAction("");
    }
  };

  const hasOpenOrder =
    order?.status === "CREATED" ||
    order?.status === "TRANSFER_CONFIRMED" ||
    order?.status === "PENDING_REVIEW";
  const canCreateOrder = Boolean(activePlan) && !hasOpenOrder;
  const canConfirmTransfer = order?.status === "CREATED";
  const canUploadBill = order?.status === "TRANSFER_CONFIRMED";
  const shouldShowUploadSection =
    order?.status === "TRANSFER_CONFIRMED" ||
    order?.status === "PENDING_REVIEW" ||
    order?.status === "APPROVED" ||
    order?.status === "REJECTED";

  const transactionStatus = (value?: PremiumUpgradeOrder["status"]): {
    label: string;
    className: string;
  } => {
    if (value === "APPROVED") {
      return {
        label: "Thành công",
        className: "bg-[#e6f4ea] text-[#137333]",
      };
    }
    if (value === "REJECTED") {
      return {
        label: "Từ chối",
        className: "bg-rose-50 text-rose-700",
      };
    }
    if (value === "PENDING_REVIEW" || value === "TRANSFER_CONFIRMED") {
      return {
        label: "Đang xử lý",
        className: "bg-amber-50 text-amber-700",
      };
    }
    return {
      label: "Đang xử lý",
      className: "bg-amber-50 text-amber-700",
    };
  };

  if (isPremiumActive && !forceUpgradeView) {
    const statusChip = transactionStatus(shownOrder?.status);

    return (
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <section className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--ink-900)]">
                Gói Của Tôi
              </h1>
              <p className="mt-2 text-sm text-[var(--ink-600)] md:text-base">
                Quản lý trạng thái và lợi ích đăng ký của bạn.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/user/premium/upgrade?view=upgrade")}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--brand-700)] transition hover:border-[var(--brand-400)]"
              >
                Thay đổi gói
              </button>
              <button
                type="button"
                onClick={() => navigate("/user/premium/upgrade?view=upgrade")}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--brand-700)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)] hover:text-white"
              >
                Gia hạn gói
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="relative flex h-full min-h-[190px] flex-col justify-between overflow-hidden rounded-[10px] border border-[#C9A24A] bg-[#FFFCF3] p-5 shadow-[0_8px_20px_rgba(7,27,58,0.05)] md:p-6 lg:col-span-2">
          {/* Watermark Award góc phải */}
          <div className="pointer-events-none absolute -right-8 -top-10 z-0 h-[250px] w-[250px] text-[#B88A20] opacity-[0.055]">
            <Award className="h-full w-full" strokeWidth={1.2} />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A6B45]">
                Gói hiện tại
              </span>

              <h2 className="mt-2 flex flex-wrap items-center gap-3 font-[var(--font-label)] text-[30px] font-extrabold leading-none text-[#071B3A]">
                {currentPlanName || "VIP"}

                <span className="inline-flex items-center gap-1 rounded-full border border-[#D6B76A] bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B88A20]">
                  <Crown size={11} />
                  VIP
                </span>
              </h2>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EE] px-3 py-1.5 text-[11px] font-semibold text-[#07884B]">
              <CheckCircle2 size={13} />
              Đang hoạt động
            </span>
          </div>

          {/* Bottom info */}
          <div className="relative z-10 mt-7 grid grid-cols-1 gap-5 border-t border-[#EFE4C8] pt-4 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-normal normal-case text-[#6B7280]">
                Ngày bắt đầu
              </p>
              <p className="mt-1 text-[11px] font-normal text-[#4B5563]">
                {formatDate(planStartedAt)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-normal normal-case text-[#6B7280]">
                Ngày hết hạn
              </p>
              <p className="mt-1 text-[11px] font-normal text-[#4B5563]">
                {formatDate(planExpiresAt)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-normal normal-case text-[#6B7280]">
                Ngày gia hạn
              </p>
              <p className="mt-1 text-[11px] font-normal text-[#4B5563]">
                {formatDate(nextPaymentAt)}
              </p>
            </div>
          </div>
        </article>

          <aside className="rounded-[16px] border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600">
                <Award size={18} />
              </span>
              <h3 className="text-lg font-bold text-[var(--ink-900)]">Lợi ích đã mở khóa</h3>
            </div>

            <ul className="space-y-4">
              {premiumActiveBenefits.map((benefit) => (
                <li key={benefit.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center text-amber-700">
                    <Check size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-900)]">{benefit.title}</p>
                    {benefit.description ? (
                      <p className="text-xs text-[var(--ink-600)]">{benefit.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="overflow-hidden rounded-none border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-[var(--line-soft)] bg-[var(--bg-soft)] px-6 py-4">
            <h3 className="text-lg font-bold text-[var(--ink-900)]">Lịch sử giao dịch</h3>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-700)] hover:text-[var(--brand-800)]"
            >
              Xem tất cả
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-page)]">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-500)]">Mô tả</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-500)] text-right">Số tiền</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-500)] text-right">Ngày</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-500)] text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="text-sm text-[var(--ink-800)]">
                {shownOrder ? (
                  <tr className="border-b border-[var(--line-soft)]">
                    <td className="px-6 py-4">{currentPlanName || currentPlanCode || "Nâng cấp Premium"}</td>
                    <td className="px-6 py-4 text-right">{formatVnd(currentPlanPrice)}</td>
                    <td className="px-6 py-4 text-right text-[var(--ink-600)]">
                      {formatDateTime(shownOrder.reviewedAt ?? shownOrder.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip.className}`}>
                        {statusChip.label}
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td className="px-6 py-5 text-sm text-[var(--ink-600)]" colSpan={4}>
                      Chưa có lịch sử giao dịch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
            <Crown size={14} />
            Premium Upgrade
          </span>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--ink-900)]">
            Nâng cấp tài khoản Premium
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ink-600)] md:text-base">
            Chuyển khoản qua QR, xác nhận đã chuyển, upload bill, admin sẽ duyệt trong ngày.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {info ? (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{info}</div>
        ) : null}

        {order?.status === "PENDING_REVIEW" ? (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {PENDING_REVIEW_TEXT}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
        <h2 className="font-[var(--font-label)] text-2xl font-bold text-[var(--ink-900)]">Dịch vụ nhận được khi lên Premium</h2>
        <p className="mt-2 text-base text-[var(--ink-600)]">
          Gói tháng: <span className="font-bold text-[var(--ink-900)]">50.000 VND</span> · Gói năm:{" "}
          <span className="font-bold text-[var(--ink-900)]">350.000 VND</span>
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {premiumBenefits.map((item) => (
            <div
              key={item.text}
              className="flex items-start gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-soft)] px-4 py-4"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <item.icon size={20} />
              </span>
              <p className="pt-1 text-base font-medium text-[var(--ink-800)]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="flex h-full flex-col rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
          <h2 className="flex items-center gap-3 font-[var(--font-label)] text-2xl font-bold text-[var(--ink-900)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-100)] text-sm font-bold text-[var(--brand-700)]">
              1
            </span>
            Chọn gói Premium
          </h2>

          <div className="mt-6 space-y-4">
            {planChoices.map((plan) => {
              const isSelected = selectedPlanCode === plan.code;
              const isYearly = plan.code === "VIP_YEARLY";

              return (
                <label
                  key={plan.code}
                  className={`relative block cursor-pointer rounded-2xl border p-5 transition ${
                    isSelected
                      ? "border-[var(--brand-500)] bg-[var(--brand-100)]/40 shadow-[0_0_0_1px_var(--brand-500)]"
                      : "border-[var(--line-soft)] bg-white hover:border-[var(--brand-300)]"
                  }`}
                >
                  {isYearly && !isPremiumActive ? (
                    <span className="absolute right-0 top-0 rounded-bl-xl rounded-tr-2xl bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                      Tiết kiệm 16%
                    </span>
                  ) : null}

                  <input
                    type="radio"
                    name="premium-plan"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => setSelectedPlanCode(plan.code)}
                  />

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-2xl font-bold leading-none text-[var(--ink-900)]">{plan.name}</p>
                      <p className="mt-2 text-sm text-[var(--ink-600)]">Thời hạn {plan.durationDays} ngày</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-3xl font-bold leading-none text-[var(--ink-900)]">{formatVnd(plan.price)}</p>
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-[var(--brand-500)] text-[var(--brand-500)]"
                            : "border-slate-300 text-transparent"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${isSelected ? "bg-[var(--brand-500)]" : "bg-transparent"}`} />
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            onClick={createOrder}
            disabled={!canCreateOrder || busyAction !== ""}
            className="mt-auto translate-y-2 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--brand-700)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "create" ? "Đang tạo..." : "Tạo yêu cầu nâng cấp"}
          </button>
        </article>

        <article className="flex h-full flex-col rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
          <h2 className="flex items-center gap-3 font-[var(--font-label)] text-2xl font-bold text-[var(--ink-900)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-100)] text-sm font-bold text-[var(--brand-700)]">
              2
            </span>
            Thanh toán qua QR
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-[190px_1fr]">
            <div className="flex h-[190px] w-[190px] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line-soft)] bg-[var(--bg-soft)]">
              {shownQrImage ? (
                <img src={shownQrImage} alt="Premium QR" className="h-full w-full rounded-2xl object-cover p-2" />
              ) : (
                <p className="px-4 text-center text-sm text-[var(--ink-500)]">Bấm tạo yêu cầu trước để hiển thị QR</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-[var(--ink-900)]">Nội dung chuyển khoản</p>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--bg-soft)] px-4 py-3 text-lg font-medium text-[var(--ink-900)]">
                  <span className="font-mono">{shownTransferContent}</span>
                  <Copy size={16} className="text-[var(--ink-500)]" />
                </div>
              </div>

              <div className="space-y-1 text-base text-[var(--ink-700)]">
                <p>
                  Gói: <span className="font-semibold text-[var(--ink-900)]">{shownPlanName}</span>
                </p>
                <p>
                  Số tiền: <span className="font-bold text-[var(--ink-900)]">{formatVnd(shownAmount)}</span>
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={confirmTransfer}
            disabled={!canConfirmTransfer || busyAction !== ""}
            className="mt-auto translate-y-2 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "confirm" ? "Đang xác nhận..." : "Tôi đã chuyển khoản xong"}
          </button>
        </article>
      </section>

      {shouldShowUploadSection ? (
      <section className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
        <h2 className="flex items-center gap-3 font-[var(--font-label)] text-2xl font-bold text-[var(--ink-900)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-100)] text-sm font-bold text-[var(--brand-700)]">
            3
          </span>
          Upload bill và chờ duyệt
        </h2>

        <div className="mt-4 space-y-2 text-sm text-[var(--ink-700)]">
          <p>
            Trạng thái hiện tại:{" "}
            <span className="font-bold text-[var(--ink-900)]">{order?.status ?? "CHƯA TẠO YÊU CẦU"}</span>
          </p>
          {order?.createdAt ? (
            <p>
              Tạo lúc: <span className="font-semibold">{formatDateTime(order.createdAt)}</span>
            </p>
          ) : null}
          {order?.transferConfirmedAt ? (
            <p>
              Xác nhận chuyển khoản lúc: <span className="font-semibold">{formatDateTime(order.transferConfirmedAt)}</span>
            </p>
          ) : null}
        </div>

        {canUploadBill ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--bg-soft)] p-4">
            <p className="text-sm font-medium text-[var(--ink-700)]">Ảnh bill thanh toán</p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                id="premium-bill-file"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => setBillFile(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="premium-bill-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line-soft)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-800)] transition hover:border-[var(--brand-400)] hover:text-[var(--brand-700)]"
              >
                <ImageUp size={16} />
                Chọn ảnh bill
              </label>
              <span className="text-sm text-[var(--ink-600)]">{billFile ? billFile.name : "Chưa chọn tệp"}</span>
            </div>

            <button
              type="button"
              onClick={uploadBill}
              disabled={!billFile || busyAction === "upload"}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ImageUp size={16} />
              {busyAction === "upload" ? "Đang gửi bill..." : "Gửi bill cho admin duyệt"}
            </button>
          </div>
        ) : null}

        {order?.status === "APPROVED" ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Yêu cầu nâng cấp đã được duyệt. Premium của bạn đã có hiệu lực.
          </div>
        ) : null}

        {order?.status === "REJECTED" ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Yêu cầu bị từ chối{order.adminNote ? `: ${order.adminNote}` : "."}
          </div>
        ) : null}

        {order?.billImageUrl ? (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-[var(--ink-900)]">Bill đã tải lên</p>
            <img
              src={order.billImageUrl}
              alt="Bill preview"
              className="max-h-72 rounded-xl border border-[var(--line-soft)] object-contain"
            />
          </div>
        ) : null}
      </section>
      ) : null}
    </main>
  );
}
