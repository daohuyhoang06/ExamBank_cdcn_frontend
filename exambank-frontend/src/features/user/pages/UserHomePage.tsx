
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  Target,
  ArrowRight,
  Trophy,
  Crown,
  Check,
  Zap,
  Flame,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  ChevronRight,
  Clock,
  BookOpen,
} from "lucide-react";
import type { Ranking, ReviewRecommendation, WeakTopicInsight } from '../types/user.type';
import { userService } from '../services/user.service';
import { getStoredAuthUser } from '@/features/auth/services/auth.service';
import { premiumUpgradeService } from '@/features/user/services/premium-upgrade.service';

/* ─── helpers ─────────────────────────────────────────────────── */

const stripHtml = (value: string): string =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const formatPercent = (value: number): string => {
  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(normalized)}%`;
};

const formatScoreValue = (raw: number | string): string => {
  const text = typeof raw === "number" ? String(raw) : raw;
  const numerator = text.split("/")[0]?.trim() ?? text;
  const parsed = Number(numerator.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed.toLocaleString("vi-VN") : numerator;
};

/** Trả về ngày tương đối dễ đọc ("Hôm nay", "Ngày mai", "3 ngày nữa", …) */
const formatRelativeDate = (value?: string): string => {
  if (!value) return "Chưa xác định";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diff < -1) return `${Math.abs(diff)} ngày trước`;
  if (diff === -1) return "Hôm qua";
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff <= 7) return `${diff} ngày nữa`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short" }).format(date);
};

/**
 * Chuyển ease factor (1.3 – 3.0) thành % sức khỏe ghi nhớ.
 * 1.3 = hay quên nhất → 0%, 3.0+ = ghi nhớ tốt → 100%.
 */
const getMemoryHealthPercent = (avgEase: number): number => {
  if (avgEase <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((avgEase - 1.3) / (3.0 - 1.3)) * 100)));
};

/* ─── config objects ──────────────────────────────────────────── */

const MEMORY_CONFIG: Record<
  string,
  { label: string; sublabel: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  FORGOTTEN: {
    label: "Đã quên",
    sublabel: "Cần ôn ngay",
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/30",
    icon: <RotateCcw className="w-3 h-3" strokeWidth={2.5} />,
  },
  HARD: {
    label: "Còn khó",
    sublabel: "Cần luyện thêm",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    icon: <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />,
  },
  REMEMBERED: {
    label: "Đã nhớ",
    sublabel: "Đúng lịch ôn",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    icon: <Check className="w-3 h-3" strokeWidth={2.5} />,
  },
  EASY: {
    label: "Dễ nhớ",
    sublabel: "Ôn định kỳ",
    bg: "bg-sky-500/15",
    text: "text-sky-300",
    border: "border-sky-500/30",
    icon: <Sparkles className="w-3 h-3" strokeWidth={2.5} />,
  },
};

const SEVERITY_CONFIG = {
  critical: {
    label: "Cần ôn gấp",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    score: "text-rose-600",
    icon: <Flame className="w-3 h-3" strokeWidth={2.5} />,
  },
  warning: {
    label: "Cần cải thiện",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    score: "text-amber-600",
    icon: <TrendingUp className="w-3 h-3" strokeWidth={2.5} />,
  },
  good: {
    label: "Đạt yêu cầu",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    score: "text-emerald-600",
    icon: <Check className="w-3 h-3" strokeWidth={2.5} />,
  },
} as const;

/* ─── component ───────────────────────────────────────────────── */

export default function UserHomePage() {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopicInsight[]>([]);
  const [reviewRecommendations, setReviewRecommendations] = useState<ReviewRecommendation[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  const reviewStats = useMemo(() => {
    const dueCount = reviewRecommendations.filter((item) => item.due).length;
    const nextReviewDate = reviewRecommendations
      .map((item) => item.nextReviewDate)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    const avgEase = reviewRecommendations.length
      ? reviewRecommendations.reduce((sum, item) => sum + (item.easeFactor ?? 0), 0) /
        reviewRecommendations.length
      : 0;
    return { dueCount, nextReviewDate, avgEase };
  }, [reviewRecommendations]);

  const memoryHealthPercent = useMemo(
    () => getMemoryHealthPercent(reviewStats.avgEase),
    [reviewStats.avgEase],
  );

  const criticalTopicCount = useMemo(
    () => weakTopics.filter((t) => t.accuracyRate < 0.7).length,
    [weakTopics],
  );

  const currentUser = useMemo(() => getStoredAuthUser(), []);

  const currentUserRanking = useMemo(() => {
    if (!currentUser) return null;
    const normalizedName = (currentUser.fullName ?? currentUser.email ?? '').trim().toLowerCase();
    const idSeed = currentUser.id !== undefined && currentUser.id !== null ? String(currentUser.id) : null;
    return (
      rankings.find((item) => idSeed && item.avatar === idSeed) ??
      rankings.find(
        (item) => normalizedName && item.name.trim().toLowerCase() === normalizedName,
      ) ??
      null
    );
  }, [currentUser, rankings]);

  useEffect(() => {
    let isActive = true;
    const loadPremiumStatus = async () => {
      try {
        const status = await premiumUpgradeService.getStatus();
        if (isActive) setIsPremiumUser(Boolean(status.premium && status.confirmed));
      } catch {
        if (isActive) setIsPremiumUser(false);
      }
    };
    const fetchData = async () => {
      setInsightsLoading(true);
      try {
        const [ranks, topics, recommendations] = await Promise.all([
          userService.getRankings(),
          userService.getWeakTopics(5),
          userService.getReviewRecommendations(8),
        ]);
        if (!isActive) return;
        setRankings(ranks);
        setWeakTopics(topics);
        setReviewRecommendations(recommendations);
      } catch (error) {
        if (isActive) console.error('Error loading data:', error);
      } finally {
        if (isActive) setInsightsLoading(false);
      }
    };
    void loadPremiumStatus();
    void fetchData();
    return () => { isActive = false; };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* ── SECTION 1: Hero & Ranking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Premium Banner */}
        <section
          onClick={() => navigate('/user/premium/upgrade')}
          className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-indigo-400/15 shadow-[0_20px_60px_-20px_rgba(59,7,100,0.5)] group cursor-pointer transition-all hover:shadow-[0_24px_70px_-20px_rgba(251,191,36,0.25)] text-white"
        >
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
          />
          <div className="absolute -top-32 -right-20 w-80 h-80 rounded-full bg-amber-400/20 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-indigo-500/25 blur-[110px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-fuchsia-500/10 blur-[80px] pointer-events-none" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
          <Crown
            className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-44 h-44 lg:w-56 lg:h-56 text-amber-300/[0.07] pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3"
            strokeWidth={1}
            fill="currentColor"
          />
          <div className="relative z-10 p-7 lg:p-8 flex flex-col h-full gap-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-400/25 to-amber-300/10 border border-amber-300/30 text-amber-200 text-[10px] font-bold uppercase tracking-[0.18em]">
                <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                Premium
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                <Zap className="w-3 h-3 text-amber-300/70" strokeWidth={2.5} />
                Ưu đãi giới hạn
              </span>
            </div>
            <div className="max-w-lg">
              <h2 className="text-[26px] lg:text-[34px] font-bold tracking-tight leading-[1.1]">
                <span className="inline-block bg-gradient-to-r from-white via-amber-100 via-50% to-white bg-clip-text text-transparent" style={{ backgroundSize: "200% 100%", animation: "shimmer-slide 4s linear infinite" }}>
                  Bứt phá điểm số với
                </span>{" "}
                <span className="inline-block bg-gradient-to-r from-amber-300 via-yellow-100 to-orange-300 bg-clip-text text-transparent [filter:drop-shadow(0_0_28px_rgba(251,191,36,0.55))]" style={{ backgroundSize: "200% 100%", animation: "shimmer-slide 3.5s linear infinite" }}>
                  AI Premium
                </span>
              </h2>
              <p className="text-[13px] mt-3 leading-relaxed max-w-md" style={{ color: "rgba(226,232,240,0.85)" }}>
                Mở khoá AI tạo đề thông minh, competition private và phân tích học tập sâu — tăng tốc hành trình ôn luyện của bạn.
              </p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 max-w-lg">
              {[
                "AI tạo đề & câu hỏi tức thì",
                "Tạo competition private",
                "Phân tích học tập nâng cao",
                "Hỗ trợ ưu tiên 24/7",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[12.5px]" style={{ color: "rgba(241,245,249,0.95)" }}>
                  <span className="w-4 h-4 rounded-md bg-amber-400/25 border border-amber-300/40 text-amber-100 flex items-center justify-center shrink-0 shadow-[0_0_12px_-2px_rgba(251,191,36,0.4)]">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                  <span className="truncate">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-4 mt-auto pt-2">
              {isPremiumUser ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/user/premium/upgrade'); }}
                  className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/30 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full" />
                  <Crown className="relative w-4 h-4" fill="currentColor" strokeWidth={2} />
                  <span className="relative tracking-tight">Xem chi tiết</span>
                  <ArrowRight className="relative w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/user/premium/upgrade'); }}
                  className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 px-6 py-3 text-sm font-bold text-[#3a1d00] ring-1 ring-amber-200/70 shadow-[0_10px_36px_-6px_rgba(251,191,36,0.55),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(180,83,9,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-6px_rgba(251,191,36,0.75),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-2px_0_rgba(180,83,9,0.18)] active:translate-y-0"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full" />
                  <Crown className="relative w-4 h-4" fill="currentColor" strokeWidth={2} />
                  <span className="relative tracking-tight">Nâng cấp ngay</span>
                  <ArrowRight className="relative w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" strokeWidth={2.5} />
                </button>
              )}
              {!isPremiumUser && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.3)]">50.000₫</span>
                  <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>/tháng</span>
                </div>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 bg-emerald-400/15 border border-emerald-400/40 px-2.5 py-1.5 rounded-md shadow-[0_0_20px_-4px_rgba(74,222,128,0.3)]">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={2.5} />
                Tiết kiệm 40% gói năm
              </span>
            </div>
          </div>
        </section>

        {/* Weekly Ranking */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
          <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 ring-1 ring-amber-100/80">
                <Trophy className="w-3.5 h-3.5" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-[13px] leading-tight">Xếp hạng tuần</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Top học viên xuất sắc</p>
              </div>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-1">Top 5</span>
          </header>
          <div className="flex-1 px-2 py-1.5">
            {rankings.length === 0 ? (
              <div className="py-10 text-center">
                <Trophy className="w-7 h-7 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">Chưa có dữ liệu bảng xếp hạng.</p>
              </div>
            ) : (
              <ul>
                {rankings.slice(0, 5).map((item) => {
                  const rankBadge =
                    item.rank === 1 ? "bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 ring-1 ring-amber-200"
                    : item.rank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 ring-1 ring-slate-300"
                    : item.rank === 3 ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700 ring-1 ring-orange-200"
                    : "bg-slate-50 text-slate-500 ring-1 ring-slate-100";
                  return (
                    <li key={item.rank} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-md font-bold text-[11px] tabular-nums ${rankBadge}`}>{item.rank}</div>
                      <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.avatar || item.name}`} alt={item.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[13px] text-slate-800 truncate leading-tight">{item.name}</p>
                        <p className="text-[10.5px] text-slate-500 tabular-nums mt-0.5">{formatScoreValue(item.score)} điểm</p>
                      </div>
                      {item.rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" strokeWidth={1.5} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <footer className="px-2 pb-2 pt-2 border-t border-slate-100">
            {currentUserRanking ? (
              <div className="flex items-center gap-2.5 bg-gradient-to-br from-blue-50 to-blue-50/40 border border-blue-100 px-3 py-2 rounded-xl">
                <div className="w-6 h-6 flex items-center justify-center rounded-md bg-white text-blue-700 ring-1 ring-blue-200 font-bold text-[11px] tabular-nums shrink-0">{currentUserRanking.rank}</div>
                <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserRanking.avatar}`} alt={currentUserRanking.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-blue-900 truncate leading-tight">{currentUserRanking.name} (Bạn)</p>
                  <p className="text-[10.5px] text-blue-700/70 tabular-nums mt-0.5">{formatScoreValue(currentUserRanking.score)} điểm</p>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-1.5 py-0.5 rounded shrink-0">Bạn</span>
              </div>
            ) : currentUser ? (
              <div className="flex items-center gap-2.5 bg-gradient-to-br from-blue-50 to-blue-50/40 border border-blue-100 px-3 py-2 rounded-xl">
                <p className="text-[11px] font-semibold text-blue-700">Bạn chưa có thứ hạng tuần này.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-gradient-to-br from-blue-50 to-blue-50/40 border border-blue-100 px-3 py-2 rounded-xl">
                <p className="text-[11px] font-semibold text-blue-700">Đăng nhập để xem thứ hạng của bạn.</p>
              </div>
            )}
          </footer>
        </section>
      </div>

      {/* ── SECTION 2: Weakness & SM-2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Điểm yếu ── */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">

          <header className="px-5 pt-4 pb-3.5 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight">Chủ đề cần ôn luyện</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">Phân tích từ lịch sử làm bài</p>
                </div>
              </div>
              {!insightsLoading && criticalTopicCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full shrink-0 whitespace-nowrap">
                  <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />
                  {criticalTopicCount} cần ôn
                </span>
              )}
            </div>
          </header>

          <div className="px-5 flex-1">
            {insightsLoading && (
              <div className="space-y-2.5 py-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`weak-sk-${i}`} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}

            {!insightsLoading && weakTopics.length === 0 && (
              <div className="py-10 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">Chưa có dữ liệu điểm yếu</p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
                  Hoàn thành vài bài thi để xem chủ đề cần cải thiện.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/user/online-exam')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Luyện tập
                </button>
              </div>
            )}

            {!insightsLoading && weakTopics.length > 0 && (
              <ul className="divide-y divide-slate-50">
                {weakTopics.slice(0, 5).map((topic, index) => {
                  const accuracy = topic.accuracyRate;
                  const severityKey =
                    accuracy < 0.5 ? "critical" : accuracy < 0.7 ? "warning" : "good";
                  const cfg = SEVERITY_CONFIG[severityKey];

                  return (
                    <li key={`${topic.topicTag}-${index}`} className="flex items-center gap-3 py-2.5">

                      {/* Rank */}
                      <span className="text-[11px] font-mono font-bold text-slate-300 w-4 shrink-0 tabular-nums select-none">
                        {index + 1}
                      </span>

                      {/* Name + progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="font-medium text-slate-800 text-[13px] truncate">{topic.topicTag}</p>
                          <span className={`text-xs font-bold tabular-nums shrink-0 ${cfg.score}`}>
                            {formatPercent(accuracy)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${cfg.bar} rounded-full transition-all duration-500`}
                              style={{ width: formatPercent(accuracy) }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                            {topic.correctCount}/{topic.totalAttempts}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/user/review?topic=${encodeURIComponent(topic.topicTag)}&accuracy=${topic.accuracyRate}&total=${topic.totalAttempts}`,
                          )
                        }
                        className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80`}
                      >
                        Luyện
                        <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!insightsLoading && weakTopics.length > 0 && (
            <footer className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 truncate">
                {weakTopics.reduce((s, t) => s + t.totalAttempts, 0)} lượt làm bài đã phân tích
              </p>
              <button
                type="button"
                onClick={() => {
                  const t = weakTopics[0];
                  if (t) navigate(`/user/review?topic=${encodeURIComponent(t.topicTag)}&accuracy=${t.accuracyRate}&total=${t.totalAttempts}`);
                  else navigate('/user/exambank');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                Xem tất cả
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </footer>
          )}
        </section>

        {/* ── SM-2 Ôn tập thông minh ── */}
        <section className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
          />

          {/* Header */}
          <header className="relative flex items-center justify-between gap-3 px-5 pt-4 pb-3.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-sm leading-tight">Ôn tập thông minh</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Câu hỏi được chọn theo điểm yếu và mức ghi nhớ của bạn
                </p>
              </div>
            </div>

            {reviewStats.dueCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/25 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-300 whitespace-nowrap shrink-0">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                {reviewStats.dueCount} đến hạn
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0">
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Đã ôn hôm nay
              </span>
            )}
          </header>

          {/* Stats row */}
          <div className="relative grid grid-cols-3 divide-x divide-white/[0.07] border-b border-white/[0.07]">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-600 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" strokeWidth={2} />
                Ôn tiếp
              </p>
              <p className="text-sm font-semibold text-white mt-1 truncate">
                {formatRelativeDate(reviewStats.nextReviewDate)}
              </p>
            </div>

            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-600 font-medium">Sức khỏe nhớ</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      memoryHealthPercent >= 60 ? "bg-emerald-400"
                        : memoryHealthPercent >= 30 ? "bg-amber-400"
                        : "bg-rose-400"
                    }`}
                    style={{ width: reviewStats.avgEase > 0 ? `${memoryHealthPercent}%` : "0%" }}
                  />
                </div>
                <span className="text-sm font-bold text-white tabular-nums shrink-0">
                  {reviewStats.avgEase > 0 ? `${memoryHealthPercent}%` : "—"}
                </span>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-600 font-medium">Hôm nay</p>
              <p className="text-sm font-semibold text-white mt-1 tabular-nums">
                {reviewRecommendations.length} câu
              </p>
            </div>
          </div>

          {/* Danh sách câu hỏi */}
          <div className="relative flex-1 px-2 py-1.5">
            {insightsLoading && (
              <div className="space-y-1.5 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`review-sk-${i}`} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            )}

            {!insightsLoading && reviewRecommendations.length === 0 && (
              <div className="py-10 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                  <Brain className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-slate-300 mb-1">Chưa có lịch ôn tập</p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                  Làm thêm bài để hệ thống xây dựng lịch ôn cá nhân hóa cho bạn.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/user/online-exam')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Luyện tập
                </button>
              </div>
            )}

            {!insightsLoading && reviewRecommendations.length > 0 && (
              <ul>
                {reviewRecommendations.slice(0, 4).map((item, index) => {
                  const content = stripHtml(item.content);
                  const snippet = content.length > 80 ? `${content.slice(0, 80)}…` : content;
                  const mem = item.memoryLevel ? MEMORY_CONFIG[item.memoryLevel] : null;
                  const isFromWeakTopic = item.source === 'WEAK_TOPIC';
                  const relDate = formatRelativeDate(item.nextReviewDate);
                  const isDueToday = relDate === 'Hôm nay';

                  return (
                    <li
                      key={`${item.questionId}-${index}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
                      onClick={() => navigate('/user/review')}
                    >
                      {/* Memory badge */}
                      {mem ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-1 rounded-lg border shrink-0 ${mem.bg} ${mem.text} ${mem.border}`}
                        >
                          {mem.icon}
                          <span className="hidden sm:inline">{mem.label}</span>
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-slate-200 leading-snug truncate">
                          {snippet || "Câu hỏi trong lịch ôn tập của bạn."}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                              isFromWeakTopic ? "text-rose-400" : "text-blue-400"
                            }`}
                          >
                            {isFromWeakTopic ? (
                              <><Target className="w-2.5 h-2.5" strokeWidth={2.5} /> Điểm yếu</>
                            ) : (
                              <><Clock className="w-2.5 h-2.5" strokeWidth={2.5} /> Đến hạn</>
                            )}
                          </span>
                          {Array.isArray(item.topicTags) && item.topicTags[0] && (
                            <span className="text-[10px] text-slate-600 truncate max-w-[80px]">
                              {typeof item.topicTags[0] === 'string'
                                ? item.topicTags[0]
                                : (item.topicTags[0] as { name?: string }).name ?? ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <span
                        className={`text-[11px] font-semibold shrink-0 tabular-nums whitespace-nowrap ${
                          isDueToday ? "text-emerald-400" : "text-slate-600"
                        }`}
                      >
                        {relDate}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <footer className="relative px-5 py-3.5 border-t border-white/[0.07] flex items-center justify-between gap-4">
            <p className="text-[11px] text-slate-600 truncate">
              Lịch ôn tự điều chỉnh theo kết quả của bạn
            </p>
            <button
              type="button"
              onClick={() => navigate(reviewStats.dueCount > 0 ? '/user/review' : '/user/exambank')}
              className="inline-flex items-center gap-1.5 bg-white text-slate-900 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              {reviewStats.dueCount > 0
                ? `Ôn ${reviewStats.dueCount} câu`
                : "Ngân hàng đề"}
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </footer>
        </section>
      </div>

    </div>
  );
}
