import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Crown, ImageUp, QrCode, Sparkles } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { premiumUpgradeService } from "@/features/user/services/premium-upgrade.service";
import type {
  PremiumPlan,
  PremiumStatus,
  PremiumUpgradeOrder,
} from "@/features/user/types/premium-upgrade.type";

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
  }).format(parsed);
};

const premiumBenefits = [
  "AI Import đề thi và tạo draft câu hỏi nhanh.",
  "Tạo private competition có mật khẩu riêng.",
  "Ưu tiên hỗ trợ và cập nhật tính năng mới.",
  "Thống kê học tập nâng cao và quản lý tiến độ.",
];

export default function PremiumUpgradePage() {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [order, setOrder] = useState<PremiumUpgradeOrder | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [billFile, setBillFile] = useState<File | null>(null);
  const [busyAction, setBusyAction] = useState<"create" | "confirm" | "upload" | "load" | "">("load");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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

  const loadData = async () => {
    setBusyAction("load");
    setError("");
    try {
      const [loadedPlans, loadedStatus, latestOrder] = await Promise.all([
        premiumUpgradeService.getPlans(),
        premiumUpgradeService.getStatus(),
        premiumUpgradeService.getMyLatestOrder(),
      ]);
      setPlans(loadedPlans);
      setStatus(loadedStatus);
      setOrder(latestOrder);
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
    if (!order || !billFile) {
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
      setInfo(PENDING_REVIEW_TEXT);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tải ảnh bill."));
    } finally {
      setBusyAction("");
    }
  };

  const canConfirmTransfer = order?.status === "CREATED";
  const canUploadBill = order?.status === "TRANSFER_CONFIRMED";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <Crown size={14} />
              Premium Upgrade
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Nâng cấp tài khoản Premium</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Chuyển khoản qua QR, xác nhận đã chuyển, upload bill, admin sẽ duyệt trong ngày.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900">Trạng thái Premium</p>
            <p className="mt-1 text-slate-600">
              {status?.premium ? "Đang Premium" : status?.status === "PENDING_CONFIRMATION" ? "Đang chờ xác nhận" : "Chưa Premium"}
            </p>
          </div>
        </div>

        {status?.premium ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Tài khoản của bạn đã có premium ({status.planName ?? status.planCode ?? "VIP"}).
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {info ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{info}</div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Dịch vụ nhận được khi lên Premium</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gói tháng: <span className="font-semibold">50.000 VND</span> · Gói năm: <span className="font-semibold">350.000 VND</span>.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {premiumBenefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <Sparkles size={16} className="mt-0.5 text-amber-500" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">1. Chọn gói và tạo yêu cầu</h2>
          <div className="mt-4 grid gap-3">
            {planChoices.map((plan) => (
              <label
                key={plan.code}
                className={`flex cursor-pointer items-start justify-between rounded-lg border px-4 py-3 ${
                  selectedPlanCode === plan.code ? "border-blue-500 bg-blue-50" : "border-slate-200"
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900">{plan.name}</p>
                  <p className="text-sm text-slate-600">Thời hạn {plan.durationDays} ngày</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-700">{formatVnd(plan.price)}</p>
                  <input
                    type="radio"
                    name="premium-plan"
                    className="mt-2 h-4 w-4"
                    checked={selectedPlanCode === plan.code}
                    onChange={() => setSelectedPlanCode(plan.code)}
                  />
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={createOrder}
            disabled={busyAction !== "" || Boolean(status?.premium)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "create" ? "Đang tạo..." : "Tạo yêu cầu nâng cấp"}
          </button>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">2. Thanh toán qua QR</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {shownQrImage ? (
                <img src={shownQrImage} alt="Temporary QR" className="h-36 w-36 rounded-md object-cover" />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500">
                  Tạo yêu cầu trước để hiện QR
                </div>
              )}
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-900">Nội dung chuyển khoản</p>
              <p className="mt-1 rounded-md bg-slate-100 px-3 py-2 font-mono text-slate-800">{shownTransferContent}</p>
              <p className="mt-3 text-slate-600">
                Gói: <span className="font-semibold text-slate-900">{shownPlanName}</span>
              </p>
              <p className="text-slate-600">
                Số tiền: <span className="font-semibold text-slate-900">{formatVnd(shownAmount)}</span>
              </p>
              <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                <QrCode size={14} />
                Mã QR tạm thời để demo
              </p>
            </div>
          </div>
          {order ? (
            <button
              type="button"
              onClick={confirmTransfer}
              disabled={!canConfirmTransfer || busyAction !== ""}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {busyAction === "confirm" ? "Đang xác nhận..." : "Tôi đã chuyển khoản xong"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              QR sẽ hiện sau khi bạn bấm "Tạo yêu cầu nâng cấp".
            </p>
          )}
        </article>
      </section>

      {order ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">3. Upload bill và chờ duyệt</h2>
          <p className="mt-1 text-sm text-slate-600">
            Trạng thái hiện tại: <span className="font-semibold text-slate-900">{order.status}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Tạo lúc: <span className="font-semibold">{formatDateTime(order.createdAt)}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Xác nhận chuyển khoản lúc: <span className="font-semibold">{formatDateTime(order.transferConfirmedAt)}</span>
          </p>

          {canUploadBill ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="text-sm font-medium text-slate-700">
                Ảnh bill thanh toán
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm"
                  onChange={(event) => setBillFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={uploadBill}
                disabled={busyAction !== "upload" ? !billFile : true}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImageUp size={16} />
                {busyAction === "upload" ? "Đang gửi bill..." : "Gửi bill cho admin duyệt"}
              </button>
            </div>
          ) : null}

          {order.status === "PENDING_REVIEW" ? (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {PENDING_REVIEW_TEXT}
            </div>
          ) : null}

          {order.status === "APPROVED" ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Yêu cầu nâng cấp đã được duyệt. Premium của bạn đã có hiệu lực.
            </div>
          ) : null}

          {order.status === "REJECTED" ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Yêu cầu bị từ chối{order.adminNote ? `: ${order.adminNote}` : "."}
            </div>
          ) : null}

          {order.billImageUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">Bill đã tải lên</p>
              <img src={order.billImageUrl} alt="Bill preview" className="max-h-72 rounded-lg border border-slate-200 object-contain" />
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
