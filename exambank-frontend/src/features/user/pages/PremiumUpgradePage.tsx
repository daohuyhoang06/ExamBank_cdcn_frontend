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
  "Don hang cua ban dang duoc van chuyen, he thong se phan hoi som nhat (thuong la trong ngay).";

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
  "AI Import de thi va tao draft cau hoi nhanh.",
  "Tao private competition co mat khau rieng.",
  "Uu tien ho tro va cap nhat tinh nang moi.",
  "Thong ke hoc tap nang cao va quan ly tien do.",
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
      setError(extractApiErrorMessage(err, "Khong the tai thong tin nang cap premium."));
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
      setError("Chua co goi premium kha dung.");
      return;
    }
    setBusyAction("create");
    setError("");
    setInfo("");
    try {
      const created = await premiumUpgradeService.createOrder(activePlan.code);
      setOrder(created);
      setInfo("Da tao yeu cau nang cap premium. Vui long chuyen khoan theo ma QR.");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Khong the tao yeu cau nang cap."));
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
      setInfo("Da xac nhan chuyen khoan. Vui long tai anh bill de he thong duyet.");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Khong the xac nhan chuyen khoan."));
    } finally {
      setBusyAction("");
    }
  };

  const uploadBill = async () => {
    if (!order || !billFile) {
      setError("Vui long chon anh bill truoc khi gui.");
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
      setError(extractApiErrorMessage(err, "Khong the tai anh bill."));
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
            <h1 className="text-2xl font-bold text-slate-900">Nang cap tai khoan Premium</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Chuyen khoan qua QR, xac nhan da chuyen, upload bill, admin se duyet trong ngay.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900">Trang thai Premium</p>
            <p className="mt-1 text-slate-600">
              {status?.premium ? "Dang Premium" : status?.status === "PENDING_CONFIRMATION" ? "Dang cho xac nhan" : "Chua Premium"}
            </p>
          </div>
        </div>

        {status?.premium ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Tai khoan cua ban da co premium ({status.planName ?? status.planCode ?? "VIP"}).
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
        <h2 className="text-lg font-semibold text-slate-900">Dich vu nhan duoc khi len Premium</h2>
        <p className="mt-1 text-sm text-slate-600">
          Goi thang: <span className="font-semibold">50.000 VND</span> - Goi nam: <span className="font-semibold">350.000 VND</span>.
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
          <h2 className="text-lg font-semibold text-slate-900">1. Chon goi va tao yeu cau</h2>
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
                  <p className="text-sm text-slate-600">Thoi han {plan.durationDays} ngay</p>
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
            {busyAction === "create" ? "Dang tao..." : "Tao yeu cau nang cap"}
          </button>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">2. Thanh toan qua QR</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {shownQrImage ? (
                <img src={shownQrImage} alt="Temporary QR" className="h-36 w-36 rounded-md object-cover" />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500">
                  Tao yeu cau truoc de hien QR
                </div>
              )}
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-900">Noi dung chuyen khoan</p>
              <p className="mt-1 rounded-md bg-slate-100 px-3 py-2 font-mono text-slate-800">{shownTransferContent}</p>
              <p className="mt-3 text-slate-600">
                Goi: <span className="font-semibold text-slate-900">{shownPlanName}</span>
              </p>
              <p className="text-slate-600">
                So tien: <span className="font-semibold text-slate-900">{formatVnd(shownAmount)}</span>
              </p>
              <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                <QrCode size={14} />
                Ma QR tam thoi de demo
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
              {busyAction === "confirm" ? "Dang xac nhan..." : "Toi da chuyen khoan xong"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              QR se hien sau khi ban bam "Tao yeu cau nang cap".
            </p>
          )}
        </article>
      </section>

      {order ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">3. Upload bill va cho duyet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Trang thai hien tai: <span className="font-semibold text-slate-900">{order.status}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Tao luc: <span className="font-semibold">{formatDateTime(order.createdAt)}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Xac nhan chuyen khoan luc: <span className="font-semibold">{formatDateTime(order.transferConfirmedAt)}</span>
          </p>

          {canUploadBill ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="text-sm font-medium text-slate-700">
                Anh bill thanh toan
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
                {busyAction === "upload" ? "Dang gui bill..." : "Gui bill cho admin duyet"}
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
              Yeu cau nang cap da duoc duyet. Premium cua ban da co hieu luc.
            </div>
          ) : null}

          {order.status === "REJECTED" ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Yeu cau bi tu choi{order.adminNote ? `: ${order.adminNote}` : "."}
            </div>
          ) : null}

          {order.billImageUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">Bill da tai len</p>
              <img src={order.billImageUrl} alt="Bill preview" className="max-h-72 rounded-lg border border-slate-200 object-contain" />
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
