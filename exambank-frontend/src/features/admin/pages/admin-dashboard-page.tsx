import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  CheckCircle2,
  Flag,
  Gauge,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";
import { StatCard } from "@/components/ui/StatCard/stat-card";

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

type QuickAction = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
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
    badge: "+1.8%",
  },
  {
    title: "Nội dung",
    value: "4,200",
    metaOne: "Đang chờ duyệt 156",
    metaTwo: "Khẩn cấp 24",
    to: "/admin/content",
    icon: CheckCircle2,
    accent: "orange",
    badge: "Cần xử lý",
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
    icon: BadgeDollarSign,
    accent: "dark",
    badge: <BadgeDollarSign size={12} />,
  },
];

const weeklyCredits = [
  { label: "T2", topUp: 60, used: 45 },
  { label: "T3", topUp: 75, used: 55 },
  { label: "T4", topUp: 85, used: 70 },
  { label: "T5", topUp: 65, used: 80 },
  { label: "T6", topUp: 90, used: 60 },
  { label: "T7", topUp: 50, used: 40 },
  { label: "CN", topUp: 40, used: 35 },
];

const urgentActions: QuickAction[] = [
  {
    title: "Server tải cao",
    description: "Hiện tại: 94% CPU usage",
    to: "/admin/system",
    icon: Gauge,
  },
  {
    title: "Đơn đăng ký mới",
    description: "24 đơn CTV cần duyệt",
    to: "/admin/users",
    icon: UserPlus,
  },
  {
    title: "Báo cáo vi phạm",
    description: "5 câu hỏi bị gắn cờ",
    to: "/admin/content",
    icon: Flag,
  },
];

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
      card: "border-emerald-400/40 bg-slate-900 text-white",
      icon: "bg-white/10 text-white",
      badge: "bg-white/10 text-white",
      meta: "text-emerald-300",
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
  const maxValue = Math.max(...weeklyCredits.map((item) => Math.max(item.topUp, item.used)));

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-blue-600">
            Tổng quan hệ thống
          </h1>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="rounded-lg text-sm font-semibold text-[var(--brand-700)] hover:bg-[var(--bg-page)]"
          >
            Xuất báo cáo
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="rounded-lg text-sm font-semibold"
          >
            Tạo kỳ thi mới
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((card) => {
          const Icon = card.icon;
          const classes = metricClasses(card.accent);
          const badgeClassName =
            card.accent === "dark"
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white"
              : `${classes.badge} text-xs font-bold`;
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
                title={card.title}
                value={card.value}
                icon={<Icon size={20} />}
                badge={card.badge}
                cardClassName={`border p-6 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md ${classes.card}`}
                iconWrapClassName={`${classes.icon} transition group-hover:scale-105`}
                badgeClassName={badgeClassName}
                titleClassName="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-500)]"
                valueClassName="text-2xl text-[var(--brand-700)]"
                subtitle={
                  <div className="mt-4 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ink-500)]">{metaOneLabel}</span>
                      <span className="font-bold">{metaOneValue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ink-500)]">{metaTwoLabel}</span>
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

      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 space-y-8 lg:col-span-8">
          <Card variant="default" padding="lg" className="rounded-3xl shadow-sm">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--ink-900)]">Biểu đồ Tín dụng</h2>
                <p className="text-sm text-[var(--ink-600)]">So sánh Nạp vs. Tiêu thụ (Tuần này)</p>
              </div>

              <div className="flex gap-4 text-xs font-medium text-[var(--ink-700)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[var(--brand-700)]" />
                  Nạp tín dụng
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-600" />
                  Tiêu thụ
                </span>
              </div>
            </div>

            <div className="relative flex h-64 items-end justify-between gap-4 px-2">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-slate-100" />
              <div className="pointer-events-none absolute inset-x-0 top-1/4 h-px bg-slate-100" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-100" />
              <div className="pointer-events-none absolute inset-x-0 top-3/4 h-px bg-slate-100" />

              {weeklyCredits.map((item) => (
                <div key={item.label} className="z-10 flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-full items-end gap-1">
                    <div
                      className="w-4 rounded-t-sm bg-[var(--brand-700)]"
                      style={{ height: `${(item.topUp / maxValue) * 180}px` }}
                    />
                    <div
                      className="w-4 rounded-t-sm bg-emerald-600"
                      style={{ height: `${(item.used / maxValue) * 180}px` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[var(--ink-500)]">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <section className="grid grid-cols-3 gap-6">
            <article className="col-span-3 rounded-2xl border border-[var(--line-soft)] bg-white p-6 shadow-sm md:col-span-1">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-500)]">
                Trạng thái server
              </h3>

              <div className="flex items-end gap-2">
                <p className="text-3xl font-extrabold text-emerald-600">99.9%</p>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                  Hoạt động
                </p>
              </div>

              <div className="mt-4 flex h-2 gap-1">
                <span className="flex-1 rounded-full bg-emerald-500" />
                <span className="flex-1 rounded-full bg-emerald-500" />
                <span className="flex-1 rounded-full bg-emerald-500" />
                <span className="flex-1 rounded-full bg-emerald-500" />
                <span className="flex-1 rounded-full bg-rose-200" />
                <span className="flex-1 rounded-full bg-emerald-500" />
              </div>
            </article>

            <article className="col-span-3 rounded-2xl border border-[var(--line-soft)] bg-white p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-500)]">
                  Logs gần đây
                </h3>
                <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  2 lỗi chưa xử lý
                </span>
              </div>

              <div className="space-y-3 text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    User #1294 login thành công
                  </span>
                  <span className="text-[var(--ink-500)]">2 phút trước</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="inline-flex items-center gap-2 text-rose-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                    Timeout tại database master
                  </span>
                  <span className="text-[var(--ink-500)]">5 phút trước</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Hệ thống sao lưu hoàn tất
                  </span>
                  <span className="text-[var(--ink-500)]">12 phút trước</span>
                </div>
              </div>
            </article>
          </section>
        </div>

        <div className="col-span-12 space-y-8 lg:col-span-4">
          <article className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--brand-700)_0%,#1a4b84_100%)] p-8 text-white shadow-xl">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10">
              <div className="mb-6 flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-300" />
                <h3 className="text-xl font-bold">Hành động Khẩn cấp</h3>
              </div>

              <div className="space-y-4">
                {urgentActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.title}
                      to={action.to}
                      className="group flex items-center justify-between rounded-2xl bg-white/10 p-4 transition hover:bg-white/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-white/20 p-2.5">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{action.title}</p>
                          <p className="text-[10px] text-blue-100">{action.description}</p>
                        </div>
                      </div>

                      <ArrowRight size={16} className="text-white/60 transition group-hover:text-white" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </article>

          <section className="space-y-4">
            <h4 className="ml-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-500)]">
              Lối tắt quản lý
            </h4>

            <Link
              to="/admin/question-bank"
              className="group block rounded-2xl border border-transparent bg-white p-5 shadow-sm transition hover:border-[var(--brand-100)] hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-slate-50 p-3 text-[var(--brand-700)] transition group-hover:bg-[var(--brand-700)] group-hover:text-white">
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <p className="font-bold text-[var(--brand-700)]">Ngân hàng câu hỏi</p>
                  <p className="text-[11px] text-[var(--ink-600)]">1.2k câu hỏi mới tuần này</p>
                </div>
              </div>
            </Link>

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
          </section>

          <article className="rounded-3xl border border-[var(--brand-100)] bg-[var(--brand-100)]/35 p-6 text-center">
            <div className="mx-auto mb-2 w-fit rounded-full bg-white p-2 text-[var(--brand-700)]">
              <ShieldCheck size={18} />
            </div>
            <h5 className="text-sm font-bold text-[var(--brand-700)]">Cập nhật hệ thống v2.4</h5>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-600)]">
              Tính năng phân tích AI cho kỳ thi đã sẵn sàng triển khai.
            </p>
            <Link to="/admin/system" className="mt-4 inline-block text-xs font-bold text-[var(--brand-700)] underline">
              Xem chi tiết
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}
