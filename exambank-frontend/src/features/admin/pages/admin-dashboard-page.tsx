import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { isAxiosError } from "axios";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card/card";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import { setAuthToken } from "@/lib/api-client";
import { getAdminDocumentStats } from "@/features/admin/services/admin-documents.service";
import { adminPremiumOrdersService } from "@/features/admin/services/admin-premium-orders.service";
import { getAdminUserCardMetrics } from "@/features/admin/services/admin-users.service";
import { clearStoredAuthUser } from "@/features/auth/services/auth.service";
import { listComposerExams } from "@/features/moderator/services/moderator-composer.service";

type DashboardStat = {
  title: string;
  value: string;
  metaOne: string;
  metaTwo: string;
  to: string;
  icon: LucideIcon;
  accent: "blue" | "orange" | "green" | "dark";
  badge?: ReactNode;
};

const dashboardStats: DashboardStat[] = [
  {
    title: "Người dùng",
    value: "25,000",
    metaOne: "Đang hoạt động 12,000",
    metaTwo: "Mới hôm nay +450",
    to: "/admin/users",
    icon: Users,
    accent: "blue",
  },
  {
    title: "Tài liệu",
    value: "4,200",
    metaOne: "Đang hiển thị 132",
    metaTwo: "Bị ẩn 6",
    to: "/admin/content",
    icon: CheckCircle2,
    accent: "orange",
    badge: "Thống kê",
  },
  {
    title: "Kỳ thi",
    value: "850",
    metaOne: "Hôm nay 120",
    metaTwo: "Đang diễn ra 11",
    to: "/admin/exams",
    icon: BookOpenCheck,
    accent: "green",
    badge: "Ổn định",
  },
  {
    title: "Doanh thu",
    value: "$82.5M",
    metaOne: "Tín dụng đã dùng 450K",
    metaTwo: "Tăng trưởng +12%",
    to: "/admin/financial",
    icon: CircleDollarSign,
    accent: "dark",
  },
];

type WeeklyRevenuePoint = {
  label: string;
  topUp: number;
  used: number;
};

const WEEKLY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

const EMPTY_WEEKLY_REVENUE: WeeklyRevenuePoint[] = WEEKLY_LABELS.map((label) => ({
  label,
  topUp: 0,
  used: 0,
}));

const initialUserCard: DashboardStat = {
  ...dashboardStats[0],
  value: "0",
  metaOne: "Đang hoạt động 0",
  metaTwo: "Mới hôm nay +0",
};

const initialContentCard: DashboardStat = {
  ...dashboardStats[1],
  value: "0",
  metaOne: "Đang hiển thị 0",
  metaTwo: "Bị ẩn 0",
};

const initialExamCard: DashboardStat = {
  ...dashboardStats[2],
  value: "0",
  metaOne: "Đã phát hành 0",
  metaTwo: "Bản nháp 0",
};

const initialRevenueCard: DashboardStat = {
  ...dashboardStats[3],
  title: "Doanh thu",
  icon: CircleDollarSign,
  value: "0 ₫",
  metaOne: "Đã duyệt 0",
  metaTwo: "Hôm nay +0 ₫",
};

const PUBLISHED_EXAM_STATUSES = new Set(["PUBLISHED"]);

function isSameDay(input: Date, ref: Date) {
  return (
    input.getFullYear() === ref.getFullYear() &&
    input.getMonth() === ref.getMonth() &&
    input.getDate() === ref.getDate()
  );
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveOrderDate(order: {
  reviewedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  transferConfirmedAt?: string;
}) {
  const candidates = [order.reviewedAt, order.updatedAt, order.transferConfirmedAt, order.createdAt];
  for (const value of candidates) {
    const parsed = parseDate(value);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekMonday(now: Date) {
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  const weekday = result.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  result.setDate(result.getDate() + diff);
  return result;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatWeekRangeLabel(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const formatDate = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${formatDate.format(weekStart)} - ${formatDate.format(weekEnd)}`;
}

function formatDayMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatInputDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAmountLabel(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRevenueAxisLabel(value: number) {
  return value === 0 ? "0" : formatAmountLabel(value);
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function isDateInRange(target: Date, start: Date, end: Date) {
  return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
}

function addRevenueByDay(store: Map<string, number>, date: Date, amount: number) {
  const key = toDateKey(date);
  store.set(key, (store.get(key) ?? 0) + amount);
}

function buildWeeklyRevenueSeries(
  approvedOrders: Array<{
    planPrice: number;
    transferConfirmedAt?: string;
    reviewedAt?: string;
    updatedAt?: string;
    createdAt?: string;
  }>,
  now: Date
): WeeklyRevenuePoint[] {
  const start = startOfWeekMonday(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const transferredRevenueByDay = new Map<string, number>();
  const approvedRevenueByDay = new Map<string, number>();

  for (const order of approvedOrders) {
    const amount = Number.isFinite(order.planPrice) ? Math.max(0, Math.round(order.planPrice)) : 0;
    if (amount <= 0) {
      continue;
    }

    const transferDate = parseDate(order.transferConfirmedAt);
    if (transferDate && isDateInRange(transferDate, start, end)) {
      addRevenueByDay(transferredRevenueByDay, transferDate, amount);
    }

    const approvedDate = resolveOrderDate(order);
    if (approvedDate && isDateInRange(approvedDate, start, end)) {
      addRevenueByDay(approvedRevenueByDay, approvedDate, amount);
    }
  }

  return WEEKLY_LABELS.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    return {
      label,
      topUp: transferredRevenueByDay.get(key) ?? 0,
      used: approvedRevenueByDay.get(key) ?? 0,
    };
  });
}

function metricClasses(accent: DashboardStat["accent"]) {
  if (accent === "orange") {
    return {
      card: "border-orange-100 bg-white",
      icon: "bg-orange-50 text-orange-700",
      badge: "bg-rose-100 text-rose-700",
      meta: "text-rose-700",
    };
  }

  if (accent === "green") {
    return {
      card: "border-emerald-100 bg-white",
      icon: "bg-emerald-50 text-emerald-700",
      badge: "bg-blue-100 text-blue-700",
      meta: "text-[var(--ink-700)]",
    };
  }

  if (accent === "dark") {
    return {
      card: "border-emerald-100 bg-white",
      icon: "bg-emerald-50 text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      meta: "text-emerald-700",
    };
  }

  return {
    card: "border-blue-100 bg-white",
    icon: "bg-blue-50 text-[var(--brand-700)]",
    badge: "bg-emerald-100 text-emerald-700",
    meta: "text-emerald-700",
  };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const weekPickerInputRef = useRef<HTMLInputElement | null>(null);
  const [userCard, setUserCard] = useState<DashboardStat>(initialUserCard);
  const [contentCard, setContentCard] = useState<DashboardStat>(initialContentCard);
  const [examCard, setExamCard] = useState<DashboardStat>(initialExamCard);
  const [revenueCard, setRevenueCard] = useState<DashboardStat>(initialRevenueCard);
  const [approvedOrdersForRevenue, setApprovedOrdersForRevenue] = useState<
    Array<{
      planPrice: number;
      transferConfirmedAt?: string;
      reviewedAt?: string;
      updatedAt?: string;
      createdAt?: string;
    }>
  >([]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyRevenuePoint[]>(EMPTY_WEEKLY_REVENUE);

  useEffect(() => {
    let isMounted = true;

    function formatNumber(value: number) {
      return new Intl.NumberFormat("vi-VN").format(value);
    }

    function formatVnd(value: number) {
      const normalized = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(normalized);
    }

    async function loadDashboardCards() {
      try {
        const [userMetrics, contentMetrics, exams, approvedOrders] = await Promise.all([
          getAdminUserCardMetrics(),
          getAdminDocumentStats(),
          listComposerExams(),
          adminPremiumOrdersService.list("APPROVED"),
        ]);

        if (!isMounted) {
          return;
        }

        const publishedExams = exams.filter((item) =>
          PUBLISHED_EXAM_STATUSES.has((item.status ?? "").toUpperCase())
        ).length;
        const draftExams = exams.length - publishedExams;
        const now = new Date();
        const createdToday = exams.filter((item) => {
          if (!item.createdAt) {
            return false;
          }

          const createdAtDate = new Date(item.createdAt);
          return !Number.isNaN(createdAtDate.getTime()) && isSameDay(createdAtDate, now);
        }).length;

        setUserCard({
          ...dashboardStats[0],
          value: formatNumber(userMetrics.totalUsers),
          metaOne: `Đang hoạt động ${formatNumber(userMetrics.activeUsers)}`,
          metaTwo: `Mới hôm nay +${formatNumber(userMetrics.newUsersToday)}`,
        });

        setContentCard({
          ...dashboardStats[1],
          value: formatNumber(contentMetrics.totalDocuments),
          metaOne: `Đã duyệt ${formatNumber(contentMetrics.approvedDocuments)}`,
          metaTwo: `Chờ duyệt ${formatNumber(contentMetrics.pendingDocuments)}`,
          badge: contentMetrics.pendingDocuments > 0 ? "Cần theo dõi" : "Ổn định",
        });

        setExamCard({
          ...dashboardStats[2],
          value: formatNumber(exams.length),
          metaOne: `Đã phát hành ${formatNumber(publishedExams)}`,
          metaTwo: `Tạo hôm nay ${formatNumber(createdToday)}`,
          badge: draftExams > 0 ? "Cần duyệt" : "Ổn định",
        });
        const totalRevenue = approvedOrders.reduce((sum, order) => sum + (order.planPrice ?? 0), 0);
        const todayRevenue = approvedOrders.reduce((sum, order) => {
          const orderDate = resolveOrderDate(order);
          if (!orderDate) {
            return sum;
          }
          return isSameDay(orderDate, now) ? sum + (order.planPrice ?? 0) : sum;
        }, 0);

        setRevenueCard({
          ...dashboardStats[3],
          title: "Doanh thu",
          icon: CircleDollarSign,
          value: formatVnd(totalRevenue),
          metaOne: `Đã duyệt ${formatNumber(approvedOrders.length)}`,
          metaTwo: `Hôm nay +${formatVnd(todayRevenue)}`,
        });
        setApprovedOrdersForRevenue(
          approvedOrders.map((order) => ({
            planPrice: order.planPrice ?? 0,
            transferConfirmedAt: order.transferConfirmedAt,
            reviewedAt: order.reviewedAt,
            updatedAt: order.updatedAt,
            createdAt: order.createdAt,
          }))
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isAxiosError(error) && error.response?.status === 401) {
          setAuthToken(null);
          clearStoredAuthUser();
          navigate("/login", { replace: true });
          return;
        }

        setUserCard(initialUserCard);
        setContentCard(initialContentCard);
        setExamCard(initialExamCard);
        setRevenueCard(initialRevenueCard);
        setApprovedOrdersForRevenue([]);
        setWeeklyRevenue(EMPTY_WEEKLY_REVENUE);
      }
    }

    void loadDashboardCards();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    setWeeklyRevenue(buildWeeklyRevenueSeries(approvedOrdersForRevenue, weekStart));
  }, [approvedOrdersForRevenue, weekStart]);

  const currentWeekStart = startOfWeekMonday(new Date());
  const weekRangeLabel = formatWeekRangeLabel(weekStart);
  const isCurrentWeek =
    weekStart.getFullYear() === currentWeekStart.getFullYear() &&
    weekStart.getMonth() === currentWeekStart.getMonth() &&
    weekStart.getDate() === currentWeekStart.getDate();

  function goToPreviousWeek() {
    setWeekStart(addDays(currentWeekStart, -7));
  }

  function goToNextWeek() {
    setWeekStart(addDays(currentWeekStart, 7));
  }

  function goToCurrentWeek() {
    setWeekStart(currentWeekStart);
  }

  const previousWeekStart = addDays(weekStart, -7);
  const currentWeekRevenue = weeklyRevenue.reduce((sum, item) => sum + item.used, 0);
  const previousWeekRevenue = buildWeeklyRevenueSeries(approvedOrdersForRevenue, previousWeekStart).reduce(
    (sum, item) => sum + item.used,
    0
  );
  const revenueChangePercent =
    previousWeekRevenue > 0
      ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
      : currentWeekRevenue > 0
        ? 100
        : 0;
  const chartBars = weeklyRevenue.map((item, index) => {
    const date = addDays(weekStart, index);
    return {
      ...item,
      date,
      revenue: item.used,
      dateLabel: formatDayMonthLabel(date),
    };
  });
  const chartAxisMax = 2_000_000;
  const chartTicks = [2_000_000, 1_500_000, 1_000_000, 500_000];
  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);
  const transactionsThisWeek = approvedOrdersForRevenue.filter((order) => {
    const orderDate = resolveOrderDate(order);
    return orderDate ? isDateInRange(orderDate, weekStart, weekEnd) : false;
  });
  const transactionCount = transactionsThisWeek.length;
  const activeSegment = isCurrentWeek
    ? "current"
    : weekStart.getTime() < currentWeekStart.getTime()
      ? "previous"
      : "next";
  const cards = [userCard, contentCard, examCard, revenueCard];

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-blue-600">
            Tổng quan hệ thống
          </h1>
        </div>

      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const isRevenueCard = card.to === "/admin/financial";
          const Icon = isRevenueCard ? CircleDollarSign : card.icon;
          const cardTitle = isRevenueCard ? "Doanh thu" : card.title;
          const classes = metricClasses(card.accent);
          const badgeClassName = `${classes.badge} text-xs font-bold`;
          const titleClassName = "text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-500)]";
          const valueClassName = "text-2xl text-[var(--brand-700)]";
          const metaLabelClassName = "text-[var(--ink-500)]";
          const metaOneLabel = card.metaOne.split(" ").slice(0, -1).join(" ");
          const metaOneValue = card.metaOne.split(" ").slice(-1);
          const metaTwoLabel = card.metaTwo.split(" ").slice(0, -1).join(" ");
          const metaTwoValue = card.metaTwo.split(" ").slice(-1);

          return (
            <Link
              key={card.title}
              to={card.to}
              className="group block"
            >
              <StatCard
                title={cardTitle}
                value={card.value}
                icon={<Icon size={20} />}
                badge={card.badge}
                cardClassName={`border p-6 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md ${classes.card}`}
                iconWrapClassName={`${classes.icon} transition group-hover:scale-105`}
                badgeClassName={badgeClassName}
                titleClassName={titleClassName}
                valueClassName={valueClassName}
                subtitle={
                  <div className="mt-4 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className={metaLabelClassName}>{metaOneLabel}</span>
                      <span className="font-bold">{metaOneValue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={metaLabelClassName}>{metaTwoLabel}</span>
                      <span className={`font-bold ${classes.meta}`}>{metaTwoValue}</span>
                    </div>
                  </div>
                }
                subtitleClassName="mt-0 text-[inherit]"
              />
            </Link>
          );
        })}
      </section>

      <section className="space-y-8">
        <div className="space-y-8">
          <Card
            variant="default"
            padding="lg"
            className="overflow-visible rounded-[32px] border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
          >
            <div className="space-y-10">
              <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,#eef5ff_0%,#e8f0ff_100%)] text-[var(--brand-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <BarChart3 size={26} strokeWidth={2.15} />
                  </div>
                  <div className="space-y-1.5 pt-0.5">
                    <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900 md:text-[27px]">
                      Biểu đồ doanh thu
                    </h2>
                    <p className="text-[10px] font-normal leading-5 text-gray-500 md:text-[12px]">
                      Thống kê doanh thu nạp tiền theo tuần
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    ref={weekPickerInputRef}
                    type="date"
                    value={formatInputDateValue(weekStart)}
                    onChange={(event) => {
                      const selected = event.target.value ? new Date(event.target.value) : null;
                      if (!selected || Number.isNaN(selected.getTime())) {
                        return;
                      }
                      setWeekStart(startOfWeekMonday(selected));
                    }}
                    className="pointer-events-none absolute h-0 w-0 opacity-0"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => weekPickerInputRef.current?.showPicker?.() ?? weekPickerInputRef.current?.click()}
                    className="flex min-w-[184px] items-center gap-2 rounded-[14px] border border-slate-200/70 bg-white/80 px-3 py-2 text-left shadow-[0_4px_14px_rgba(148,163,184,0.08)] transition hover:border-slate-300/80 hover:bg-white hover:shadow-[0_8px_18px_rgba(148,163,184,0.12)]"
                  >
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-400">
                      <CalendarDays size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-slate-500 md:text-[12px]">
                        {weekRangeLabel}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] xl:items-center">
                <div className="inline-flex w-full flex-wrap gap-1.5 rounded-[20px] bg-slate-100/80 p-1.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] xl:w-fit">
                  <button
                    type="button"
                    onClick={goToPreviousWeek}
                    className={`rounded-[15px] px-4.5 py-2.5 text-[12px] font-medium transition md:text-[13px] ${
                      activeSegment === "previous"
                        ? "bg-[linear-gradient(180deg,var(--brand-600)_0%,var(--brand-700)_100%)] text-white shadow-[var(--shadow-brand)] hover:brightness-105"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Tuần trước
                  </button>
                  <button
                    type="button"
                    onClick={goToCurrentWeek}
                    className={`rounded-[15px] px-4.5 py-2.5 text-[12px] font-medium transition md:text-[13px] ${
                      activeSegment === "current"
                        ? "bg-[linear-gradient(180deg,var(--brand-600)_0%,var(--brand-700)_100%)] text-white shadow-[var(--shadow-brand)] hover:brightness-105"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Tuần này
                  </button>
                  <button
                    type="button"
                    onClick={goToNextWeek}
                    className={`rounded-[15px] px-4.5 py-2.5 text-[12px] font-medium transition md:text-[13px] ${
                      activeSegment === "next"
                        ? "bg-[linear-gradient(180deg,var(--brand-600)_0%,var(--brand-700)_100%)] text-white shadow-[var(--shadow-brand)] hover:brightness-105"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Tuần sau
                  </button>
                </div>

                <div className="rounded-[26px] border border-slate-200/75 bg-white/95 px-5 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-50/80 text-emerald-600">
                        <TrendingUp size={24} strokeWidth={2.1} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-normal text-gray-500">
                          Tổng doanh thu
                        </p>
                        <p className="text-[24px] font-semibold tracking-[-0.03em] text-slate-900 md:text-[27px]">
                          {formatCurrency(currentWeekRevenue)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-left md:text-right">
                      <p
                        className="text-[10px] font-semibold tracking-normal"
                        style={{ color: revenueChangePercent >= 0 ? "#059669" : "#f43f5e" }}
                      >
                        {formatSignedPercent(revenueChangePercent)}
                      </p>
                      <p className="text-[11px] font-normal text-gray-500">so với tuần trước</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(148,163,184,0.12)] md:p-7">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex flex-wrap items-center gap-2 text-[14px] font-semibold text-slate-600 md:text-[15px]">
                    <span className="h-3.5 w-3.5 rounded-full bg-[linear-gradient(180deg,#3b82f6_0%,#1d4ed8_100%)] shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                    <span>Doanh thu (VND)</span>
                    <span className="text-[11px] font-medium text-slate-400 md:text-[12px]">
                      ({new Intl.NumberFormat("vi-VN").format(transactionCount)} lượt giao dịch)
                    </span>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-400">
                    Hover để xem chi tiết từng ngày
                  </div>
                </div>

                <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
                  <div className="relative h-[400px]">
                    <div className="absolute inset-x-0 top-0 h-[344px]">
                      {chartTicks.map((tick) => (
                        <div
                          key={tick}
                          className="absolute left-0 flex -translate-y-1/2 items-center text-[12px] font-semibold text-slate-500"
                          style={{ top: `${(1 - tick / chartAxisMax) * 100}%` }}
                        >
                          {formatRevenueAxisLabel(tick)}
                        </div>
                      ))}
                      <div className="absolute bottom-0 left-0 leading-none text-[12px] font-semibold text-slate-500">0</div>
                    </div>
                  </div>

                  <div className="relative h-[400px]">
                    <div className="absolute inset-x-0 top-0 h-[344px]">
                      {chartTicks.map((tick) => (
                        <div
                          key={`grid-${tick}`}
                          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-200/80"
                          style={{ top: `${(1 - tick / chartAxisMax) * 100}%` }}
                        />
                      ))}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-slate-200/90" />
                    </div>

                    <div className="absolute inset-x-0 top-0 h-[344px] px-1.5 md:px-2.5">
                      <div className="flex h-full items-end justify-between gap-4 md:gap-6">
                      {chartBars.map((item) => (
                        <div
                          key={`${item.label}-${item.dateLabel}`}
                          className="group relative flex h-full flex-1 flex-col items-center justify-end"
                        >
                          <div className="pointer-events-none absolute -top-3 left-1/2 z-20 w-[168px] -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white/95 p-2.5 opacity-0 shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition duration-200 group-hover:-translate-y-2 group-hover:opacity-100">
                            <p
                              className="leading-none text-slate-500"
                              style={{ fontSize: "10px", fontWeight: 400 }}
                            >
                              {item.label} - {item.dateLabel}
                            </p>
                            <div className="mt-1.5 flex items-center justify-between text-[11px]">
                              <span className="inline-flex items-center gap-1.5 text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                Doanh thu
                              </span>
                              <span className="font-semibold text-slate-900">{formatCurrency(item.revenue)}</span>
                            </div>
                          </div>

                          <div className="flex h-full w-full items-end justify-center">
                            <div className="flex w-full max-w-[64px] flex-col items-center gap-2.5">
                              <span className="text-[13px] font-semibold tracking-tight text-slate-600">
                                {item.revenue > 0 ? formatAmountLabel(item.revenue) : ""}
                              </span>
                              {item.revenue > 0 ? (
                                <div
                                  className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#3b82f6_0%,#1d4ed8_100%)] shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_36px_rgba(37,99,235,0.34)]"
                                  style={{ height: `${Math.min((item.revenue / chartAxisMax) * 320, 320)}px` }}
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-[56px] px-1.5 md:px-2.5">
                      <div className="flex h-full items-center justify-between gap-4 md:gap-6 text-[11px] font-semibold text-slate-500">
                      {chartBars.map((item) => (
                        <div key={`x-${item.label}-${item.dateLabel}`} className="flex flex-1 flex-col items-center text-center leading-tight">
                          <p>{item.label}</p>
                          <p className="text-[10px] font-medium text-slate-400">{item.dateLabel}</p>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </Card>

          <section className="space-y-4">
            <h4 className="ml-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-500)]">
              Lối tắt quản lý
            </h4>

            <div className="grid grid-cols-1 gap-4">
              <Link
                to="/admin/financial"
                className="group block rounded-2xl border border-transparent bg-white p-5 shadow-sm transition hover:border-[var(--brand-100)] hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-slate-50 p-3 text-[var(--brand-700)] transition group-hover:bg-[var(--brand-700)] group-hover:text-white">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--brand-700)]">Gói thành viên</p>
                    <p className="text-[11px] text-[var(--ink-600)]">Quản lý các gói Pro/Premium</p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
