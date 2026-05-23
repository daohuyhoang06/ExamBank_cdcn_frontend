
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
} from "lucide-react";
import type { Ranking, ReviewRecommendation, WeakTopicInsight } from '../types/user.type';
import { userService } from '../services/user.service';
import { getStoredAuthUser } from '@/features/auth/services/auth.service';
import { premiumUpgradeService } from '@/features/user/services/premium-upgrade.service';
import { getStoredAuthToken } from '@/lib/api-client';

const SOURCE_LABELS: Record<string, string> = {
  DUE_REVIEW: "Đến hạn",
  WEAK_TOPIC: "Điểm yếu",
};

const MEMORY_LABELS_DARK: Record<string, { label: string; tone: string }> = {
  FORGOTTEN: { label: "Quên", tone: "text-rose-300" },
  HARD: { label: "Khó", tone: "text-amber-300" },
  REMEMBERED: { label: "Đã nhớ", tone: "text-emerald-300" },
  EASY: { label: "Dễ", tone: "text-teal-300" },
};

const stripHtml = (value: string): string => {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const formatPercent = (value: number): string => {
  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(normalized)}%`;
};

const formatScoreValue = (raw: number | string): string => {
  const text = typeof raw === "number" ? String(raw) : raw;
  const numerator = text.split("/")[0]?.trim() ?? text;
  const parsed = Number(numerator.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) {
    return numerator;
  }
  return parsed.toLocaleString("vi-VN");
};

const formatDate = (value?: string): string => {
  if (!value) {
    return "Chưa có";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

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
      .filter((date): date is string => Boolean(date))
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];

    const avgEase = reviewRecommendations.length
      ? reviewRecommendations.reduce((total, item) => total + (item.easeFactor ?? 0), 0) / reviewRecommendations.length
      : 0;

    return {
      dueCount,
      nextReviewDate,
      avgEase,
    };
  }, [reviewRecommendations]);

  const currentUser = useMemo(() => getStoredAuthUser(), []);

  const currentUserRanking = useMemo(() => {
    if (!currentUser) {
      return null;
    }

    const normalizedName = (currentUser.fullName ?? currentUser.email ?? '').trim().toLowerCase();
    const idSeed = currentUser.id !== undefined && currentUser.id !== null ? String(currentUser.id) : null;

    return (
      rankings.find((item) => (idSeed && item.avatar === idSeed))
      ?? rankings.find((item) => normalizedName && item.name.trim().toLowerCase() === normalizedName)
      ?? null
    );
  }, [currentUser, rankings]);

  useEffect(() => {
    let isActive = true;
    const token = getStoredAuthToken();
    const loadPremiumStatus = async () => {
      if (!token) {
        if (isActive) {
          setIsPremiumUser(false);
        }
        return;
      }
      try {
        const status = await premiumUpgradeService.getStatus();
        if (isActive) {
          setIsPremiumUser(Boolean(status.premium && status.confirmed));
        }
      } catch {
        if (isActive) {
          setIsPremiumUser(false);
        }
      }
    };
    const fetchData = async () => {
      setInsightsLoading(true);
      if (!token) {
        if (isActive) {
          setWeakTopics([]);
          setReviewRecommendations([]);
          setInsightsLoading(false);
        }
        try {
          const ranks = await userService.getRankings();
          if (isActive) {
            setRankings(ranks);
          }
        } catch (error) {
          if (isActive) {
            console.error('Error loading rankings:', error);
          }
        }
        return;
      }
      try {
        const [ranks, topics, recommendations] = await Promise.all([
          userService.getRankings(),
          userService.getWeakTopics(5),
          userService.getReviewRecommendations(8),
        ]);
        if (!isActive) {
          return;
        }
        setRankings(ranks);
        setWeakTopics(topics);
        setReviewRecommendations(recommendations);
      } catch (error) {
        if (isActive) {
          console.error('Error loading data:', error);
        }
      } finally {
        if (isActive) {
          setInsightsLoading(false);
        }
      }
    };
    void loadPremiumStatus();
    fetchData();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      
      {/* SECTION 1: Hero & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Premium Banner */}
        <section
          onClick={() => navigate('/user/premium/upgrade')}
          className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-indigo-400/15 shadow-[0_20px_60px_-20px_rgba(59,7,100,0.5)] group cursor-pointer transition-all hover:shadow-[0_24px_70px_-20px_rgba(251,191,36,0.25)] text-white"
        >
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* Glow orbs */}
          <div className="absolute -top-32 -right-20 w-80 h-80 rounded-full bg-amber-400/20 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-indigo-500/25 blur-[110px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-fuchsia-500/10 blur-[80px] pointer-events-none" />

          {/* Top highlight line */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

          {/* Decorative crown — right side */}
          <Crown
            className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-44 h-44 lg:w-56 lg:h-56 text-amber-300/[0.07] pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3"
            strokeWidth={1}
            fill="currentColor"
          />

          <div className="relative z-10 p-7 lg:p-8 flex flex-col h-full gap-6">
            {/* Header: badges */}
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

            {/* Heading */}
            <div className="max-w-lg">
              <h2 className="text-[26px] lg:text-[34px] font-bold tracking-tight leading-[1.1]">
                <span
                  className="inline-block bg-gradient-to-r from-white via-amber-100 via-50% to-white bg-clip-text text-transparent"
                  style={{
                    backgroundSize: "200% 100%",
                    animation: "shimmer-slide 4s linear infinite",
                  }}
                >
                  Bứt phá điểm số với
                </span>{" "}
                <span
                  className="inline-block bg-gradient-to-r from-amber-300 via-yellow-100 to-orange-300 bg-clip-text text-transparent [filter:drop-shadow(0_0_28px_rgba(251,191,36,0.55))]"
                  style={{
                    backgroundSize: "200% 100%",
                    animation: "shimmer-slide 3.5s linear infinite",
                  }}
                >
                  AI Premium
                </span>
              </h2>
              <p className="text-[13px] mt-3 leading-relaxed max-w-md" style={{ color: "rgba(226,232,240,0.85)" }}>
                Mở khoá AI tạo đề thông minh, competition private và phân tích học tập sâu — tăng tốc hành trình ôn luyện của bạn.
              </p>
            </div>

            {/* Feature checklist */}
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

            {/* CTA + price */}
            <div className="flex flex-wrap items-center gap-4 mt-auto pt-2">
              {isPremiumUser ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/user/premium/upgrade');
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/user/premium/upgrade');
                  }}
                  className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 px-6 py-3 text-sm font-bold text-[#3a1d00] ring-1 ring-amber-200/70 shadow-[0_10px_36px_-6px_rgba(251,191,36,0.55),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(180,83,9,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-6px_rgba(251,191,36,0.75),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-2px_0_rgba(180,83,9,0.18)] active:translate-y-0"
                >
                  {/* Shine sweep effect */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full" />
                  <Crown className="relative w-4 h-4" fill="currentColor" strokeWidth={2} />
                  <span className="relative tracking-tight">Nâng cấp ngay</span>
                  <ArrowRight className="relative w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" strokeWidth={2.5} />
                </button>
              )}

              {!isPremiumUser ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.3)]">50.000₫</span>
                  <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>/tháng</span>
                </div>
              ) : null}

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
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Chưa có dữ liệu bảng xếp hạng.
                </p>
              </div>
            ) : (
              <ul>
                {rankings.slice(0, 5).map((item) => {
                  const rankBadge = item.rank === 1
                    ? "bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 ring-1 ring-amber-200"
                    : item.rank === 2
                      ? "bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 ring-1 ring-slate-300"
                      : item.rank === 3
                        ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700 ring-1 ring-orange-200"
                        : "bg-slate-50 text-slate-500 ring-1 ring-slate-100";

                  return (
                    <li
                      key={item.rank}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className={`w-6 h-6 flex items-center justify-center rounded-md font-bold text-[11px] tabular-nums ${rankBadge}`}
                      >
                        {item.rank}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.avatar || item.name}`}
                          alt={item.name}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[13px] text-slate-800 truncate leading-tight">{item.name}</p>
                        <p className="text-[10.5px] text-slate-500 tabular-nums mt-0.5">
                          {formatScoreValue(item.score)} điểm
                        </p>
                      </div>
                      {item.rank === 1 && (
                        <Crown
                          className="w-3.5 h-3.5 text-amber-500 shrink-0"
                          fill="currentColor"
                          strokeWidth={1.5}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="px-2 pb-2 pt-2 border-t border-slate-100">
            {currentUserRanking ? (
              <div className="flex items-center gap-2.5 bg-gradient-to-br from-blue-50 to-blue-50/40 border border-blue-100 px-3 py-2 rounded-xl">
                <div className="w-6 h-6 flex items-center justify-center rounded-md bg-white text-blue-700 ring-1 ring-blue-200 font-bold text-[11px] tabular-nums shrink-0">
                  {currentUserRanking.rank}
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserRanking.avatar}`}
                    alt={currentUserRanking.name}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-blue-900 truncate leading-tight">
                    {currentUserRanking.name} (Bạn)
                  </p>
                  <p className="text-[10.5px] text-blue-700/70 tabular-nums mt-0.5">
                    {formatScoreValue(currentUserRanking.score)} điểm
                  </p>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                  Bạn
                </span>
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

      {/* SECTION 2: Weakness & SM-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gợi ý điểm yếu */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
          <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-[15px] leading-tight">Gợi ý điểm yếu</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ưu tiên chuyên đề có tỉ lệ đúng thấp nhất
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
              <Sparkles className="w-3 h-3" strokeWidth={2.5} />
              AI
            </span>
          </header>

          <div className="px-6 py-3 flex-1">
            {insightsLoading && (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`weak-skeleton-${index}`} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}

            {!insightsLoading && weakTopics.length === 0 && (
              <div className="py-10 text-center">
                <Target className="w-8 h-8 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Chưa có dữ liệu điểm yếu. Hoàn thành vài bài để hệ thống gợi ý.
                </p>
              </div>
            )}

            {!insightsLoading && weakTopics.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {weakTopics.slice(0, 5).map((topic, index) => {
                  const accuracy = topic.accuracyRate;
                  const severity = accuracy < 0.5 ? "critical" : accuracy < 0.7 ? "warning" : "good";
                  const palette = {
                    critical: { dot: "bg-rose-500", bar: "bg-rose-500", text: "text-rose-600" },
                    warning: { dot: "bg-amber-500", bar: "bg-amber-500", text: "text-amber-600" },
                    good: { dot: "bg-emerald-500", bar: "bg-emerald-500", text: "text-emerald-600" },
                  }[severity];

                  return (
                    <li
                      key={`${topic.topicTag}-${index}`}
                      className="flex items-center gap-4 py-3"
                    >
                      <span className="text-[11px] font-mono font-semibold text-slate-400 w-6 tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
                          <p className="font-medium text-slate-800 text-sm truncate">{topic.topicTag}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${palette.bar} rounded-full transition-all`}
                              style={{ width: formatPercent(accuracy) }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                            {topic.correctCount}/{topic.totalAttempts}
                          </span>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${palette.text}`}>
                        {formatPercent(accuracy)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* SM-2 Review */}
        <section className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] flex flex-col">
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />

          <header className="relative flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center shrink-0 ring-1 ring-blue-400/20">
                <Brain className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-[15px] leading-tight">Lịch ôn tập thông minh</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Thuật toán SM-2 tự điều chỉnh theo mức ghi nhớ
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-300 whitespace-nowrap">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="tabular-nums">{reviewStats.dueCount} đến hạn</span>
            </span>
          </header>

          <div className="relative grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Ôn tiếp theo</p>
              <p className="text-sm font-semibold text-white mt-1.5">
                {formatDate(reviewStats.nextReviewDate)}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Độ ghi nhớ TB</p>
              <p className="text-sm font-semibold text-white mt-1.5 tabular-nums">
                {reviewStats.avgEase > 0 ? reviewStats.avgEase.toFixed(2) : "—"}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Hôm nay</p>
              <p className="text-sm font-semibold text-white mt-1.5 tabular-nums">
                {reviewRecommendations.length} câu
              </p>
            </div>
          </div>

          <div className="relative px-3 py-2 flex-1">
            {insightsLoading && (
              <div className="space-y-2 px-3 py-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`review-skeleton-${index}`} className="h-12 rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            )}

            {!insightsLoading && reviewRecommendations.length === 0 && (
              <div className="py-10 text-center">
                <Brain className="w-8 h-8 text-slate-600 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Chưa có gợi ý ôn tập. Hoàn thành thêm bài để SM-2 xếp lịch.
                </p>
              </div>
            )}

            {!insightsLoading && reviewRecommendations.length > 0 && (
              <ul>
                {reviewRecommendations.slice(0, 4).map((item, index) => {
                  const content = stripHtml(item.content);
                  const snippet = content.length > 100 ? `${content.slice(0, 100)}…` : content;
                  const sourceLabel = item.source ? SOURCE_LABELS[item.source] ?? item.source : "Đề xuất";
                  const memoryMeta = item.memoryLevel ? MEMORY_LABELS_DARK[item.memoryLevel] : null;

                  return (
                    <li
                      key={`${item.questionId}-${index}`}
                      className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors"
                    >
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          item.due ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wider">
                          {memoryMeta && (
                            <span className={`font-semibold ${memoryMeta.tone}`}>{memoryMeta.label}</span>
                          )}
                          {memoryMeta && <span className="text-slate-600">·</span>}
                          <span className="text-slate-500 font-medium">{sourceLabel}</span>
                        </div>
                        <p className="text-sm text-slate-200 leading-snug line-clamp-2">
                          {snippet || "Câu hỏi ưu tiên cho lịch ôn tập của bạn."}
                        </p>
                      </div>
                      {item.nextReviewDate && (
                        <span className="text-[10px] text-slate-500 flex-shrink-0 tabular-nums mt-1.5 whitespace-nowrap">
                          {formatDate(item.nextReviewDate)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="relative px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">Tự động đồng bộ theo lịch SM-2</span>
            <button
              onClick={() => navigate('/user/exambank')}
              className="inline-flex items-center gap-1.5 bg-white text-slate-900 px-3.5 py-2 rounded-lg font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Bắt đầu ôn tập
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </footer>
        </section>
      </div>

    </div>
  );
}
