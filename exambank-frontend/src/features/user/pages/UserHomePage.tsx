
import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  ArrowRight,
  Trophy,
  Crown,
  Check,
  Zap,
  Coins,
  Flame,
  UploadCloud,
  Download,
  TrendingUp,
  ChevronRight,
  BookOpen,
  CalendarDays,
  Calculator,
  Languages,
  Code2,
  Atom,
  FlaskConical,
  Landmark,
  Library,
  Rocket,
  X,
} from "lucide-react";
import type { Ranking, ReviewRecommendation, WeakTopicInsight } from '../types/user.type';
import { userService } from '../services/user.service';
import { getStoredAuthUser } from '@/features/auth/services/auth.service';
import { premiumUpgradeService } from '@/features/user/services/premium-upgrade.service';
import { getStoredAuthToken } from '@/lib/api-client';

/* ─── helpers ─────────────────────────────────────────────────── */

const stripHtml = (value: string): string =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const formatScoreValue = (raw: number | string): string => {
  const text = typeof raw === "number" ? String(raw) : raw;
  const numerator = text.split("/")[0]?.trim() ?? text;
  const parsed = Number(numerator.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed.toLocaleString("vi-VN") : numerator;
};

const normalizeSubjectKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const SUBJECT_NAME_OVERRIDES = new Map<string, string>([
  ["toan", "Toán"],
  ["toan hoc", "Toán học"],
  ["vat ly", "Vật lý"],
  ["vat li", "Vật lý"],
  ["hoa hoc", "Hóa học"],
  ["hoa", "Hóa"],
  ["sinh hoc", "Sinh học"],
  ["ngu van", "Ngữ văn"],
  ["van", "Ngữ văn"],
  ["tieng anh", "Tiếng Anh"],
  ["anh", "Tiếng Anh"],
  ["dia ly", "Địa lý"],
  ["lich su", "Lịch sử"],
  ["tin hoc", "Tin học"],
  ["lap trinh", "Lập trình"],
  ["tieng nhat", "Tiếng Nhật"],
  ["nhat", "Tiếng Nhật"],
  ["giao duc cong dan", "Giáo dục công dân"],
  ["cong nghe", "Công nghệ"],
  ["quoc phong an ninh", "Quốc phòng an ninh"],
  ["khoa hoc tu nhien", "Khoa học tự nhiên"],
  ["khoa hoc xa hoi", "Khoa học xã hội"],
]);

const formatSubjectNameWithAccents = (name: string): string => {
  const normalized = normalizeSubjectKey(name);
  const mapped = SUBJECT_NAME_OVERRIDES.get(normalized);
  if (mapped) return mapped;

  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // Title-case fallback for unknown subjects.
  return trimmed
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeRoles = (user: { role?: string; roles?: string[] } | null | undefined): string[] =>
  [user?.role, ...(user?.roles ?? [])]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toUpperCase().replace("ROLE_", ""));

type SubjectCatalogItem = {
  id: number;
  name: string;
};

type SmartReviewSubjectItem = {
  key: string;
  name: string;
  count: number;
  subjectId?: number;
};

type SmartReviewTopicItem = {
  key: string;
  topicName: string;
  subjectName: string;
  subjectId?: number;
  questionCount: number;
  dueCount: number;
  priorityScore: number;
  difficulty: "easy" | "medium" | "hard";
};

const SUBJECT_VISUALS = [
  {
    matchers: ["toán", "math"],
    icon: Calculator,
    iconClass: "text-blue-600",
    iconBgClass: "bg-blue-100",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    matchers: ["nhật", "japanese"],
    icon: Languages,
    iconClass: "text-emerald-600",
    iconBgClass: "bg-emerald-100",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    matchers: ["lập trình", "tin học", "thuật toán", "code", "program"],
    icon: Code2,
    iconClass: "text-violet-600",
    iconBgClass: "bg-violet-100",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    matchers: ["vật lý", "physics"],
    icon: Atom,
    iconClass: "text-amber-600",
    iconBgClass: "bg-amber-100",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    matchers: ["hóa", "chem"],
    icon: FlaskConical,
    iconClass: "text-rose-600",
    iconBgClass: "bg-rose-100",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
  },
  {
    matchers: ["lịch sử", "history"],
    icon: Landmark,
    iconClass: "text-slate-600",
    iconBgClass: "bg-slate-100",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

const getSubjectVisual = (subjectName: string) => {
  const normalized = subjectName.trim().toLowerCase();
  return (
    SUBJECT_VISUALS.find((item) => item.matchers.some((matcher) => normalized.includes(matcher))) ?? {
      icon: Library,
      iconClass: "text-cyan-600",
      iconBgClass: "bg-cyan-100",
      badgeClass: "bg-cyan-100 text-cyan-700 border-cyan-200",
    }
  );
};

const getRecommendationPrimaryTopic = (item: ReviewRecommendation): string => {
  const topicName = item.topicTags.find((tag) => tag.trim().length > 0)?.trim();
  if (topicName) {
    return topicName;
  }
  const fallback = stripHtml(item.content);
  return fallback.length > 0 ? fallback.slice(0, 60) : `Chủ đề #${item.questionId}`;
};

const getRecommendationDifficulty = (
  item: ReviewRecommendation,
  weakTopicByName: Map<string, WeakTopicInsight>,
): "easy" | "medium" | "hard" => {
  const primaryTopic = getRecommendationPrimaryTopic(item);
  const weakTopic = weakTopicByName.get(primaryTopic.toLowerCase());

  if (item.memoryLevel === "FORGOTTEN" || item.source === "WEAK_TOPIC" || (weakTopic?.accuracyRate ?? 1) < 0.5) {
    return "hard";
  }

  if (item.memoryLevel === "HARD" || (weakTopic?.accuracyRate ?? 1) < 0.7) {
    return "medium";
  }

  return "easy";
};



const COIN_RULES = [
  {
    icon: Flame,
    title: "Đăng nhập ngày đầu",
    value: "+20 coin",
    iconColor: "text-orange-600 bg-orange-50",
    valueColor: "text-orange-600",
  },
  {
    icon: Flame,
    title: "Chuỗi ngày 2-49",
    value: "+5 coin/ngay",
    iconColor: "text-orange-600 bg-orange-50",
    valueColor: "text-orange-600",
  },
  {
    icon: Flame,
    title: "Chuỗi 50+ / 100+",
    value: "+10 / +15 coin",
    iconColor: "text-orange-600 bg-orange-50",
    valueColor: "text-orange-600",
  },
  {
    icon: UploadCloud,
    title: "Upload tài liệu được duyệt",
    value: "+10 coin",
    iconColor: "text-emerald-600 bg-emerald-50",
    valueColor: "text-emerald-600",
  },
  {
    icon: Download,
    title: "Tải tài liệu đã duyệt",
    value: "-5 coin",
    iconColor: "text-rose-600 bg-rose-50",
    valueColor: "text-rose-600",
  },
];

/* ─── component ───────────────────────────────────────────────── */

export default function UserHomePage() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredAuthUser(), []);
  const currentUserRoles = useMemo(() => normalizeRoles(currentUser), [currentUser]);
  const isStandardUserRole =
    currentUserRoles.includes("USER") &&
    !currentUserRoles.includes("ADMIN") &&
    !currentUserRoles.includes("MODERATOR");
  const [coinBalance, setCoinBalance] = useState(() =>
    typeof currentUser?.coinBalance === "number" ? currentUser.coinBalance : 0,
  );
  const [currentStreak, setCurrentStreak] = useState(() =>
    typeof currentUser?.streak === "number" ? currentUser.streak : 0,
  );
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopicInsight[]>([]);
  const [reviewRecommendations, setReviewRecommendations] = useState<ReviewRecommendation[]>([]);
  const [subjectCatalog, setSubjectCatalog] = useState<SubjectCatalogItem[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  const [showRulesPopover, setShowRulesPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    return currentUser?.fullName ?? currentUser?.name ?? currentUser?.email ?? "Học viên";
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowRulesPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const reviewStats = useMemo(() => {
    const dueCount = reviewRecommendations.filter((item) => item.due).length;
    const nextReviewDate = reviewRecommendations
      .map((item) => item.nextReviewDate)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    return { dueCount, nextReviewDate };
  }, [reviewRecommendations]);

  const subjectNameById = useMemo(() => {
    return new Map(subjectCatalog.map((item) => [item.id, item.name]));
  }, [subjectCatalog]);

  const weakTopicByName = useMemo(() => {
    return new Map(
      weakTopics.map((item) => [item.topicTag.trim().toLowerCase(), item] as const),
    );
  }, [weakTopics]);

  const dueRecommendations = useMemo(() => {
    const dueItems = reviewRecommendations.filter((item) => item.due);
    return dueItems.length > 0 ? dueItems : reviewRecommendations;
  }, [reviewRecommendations]);

  const smartReviewSubjects = useMemo<SmartReviewSubjectItem[]>(() => {
    const counts = new Map<string, SmartReviewSubjectItem>();

    for (const item of dueRecommendations) {
      const subjectName =
        (item.subjectId ? subjectNameById.get(item.subjectId) : undefined) ??
        "Chưa phân loại";
      const key = `${item.subjectId ?? "unknown"}:${subjectName}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          key,
          name: subjectName,
          count: 1,
          subjectId: item.subjectId,
        });
      }
    }

    return Array.from(counts.values()).sort((left, right) => right.count - left.count);
  }, [dueRecommendations, subjectNameById]);

  const smartReviewTopics = useMemo<SmartReviewTopicItem[]>(() => {
    const topics = new Map<string, SmartReviewTopicItem>();

    for (const item of dueRecommendations) {
      const topicName = getRecommendationPrimaryTopic(item);
      const subjectName =
        (item.subjectId ? subjectNameById.get(item.subjectId) : undefined) ??
        "Chưa phân loại";
      const difficulty = getRecommendationDifficulty(item, weakTopicByName);
      const difficultyScore = difficulty === "hard" ? 3 : difficulty === "medium" ? 2 : 1;
      const dueScore = item.due ? 2 : 0;
      const key = `${item.subjectId ?? "unknown"}:${topicName.toLowerCase()}`;
      const existing = topics.get(key);

      if (existing) {
        existing.questionCount += 1;
        existing.dueCount += item.due ? 1 : 0;
        existing.priorityScore += difficultyScore + dueScore;
        if (difficultyScore > (existing.difficulty === "hard" ? 3 : existing.difficulty === "medium" ? 2 : 1)) {
          existing.difficulty = difficulty;
        }
      } else {
        topics.set(key, {
          key,
          topicName,
          subjectName,
          subjectId: item.subjectId,
          questionCount: 1,
          dueCount: item.due ? 1 : 0,
          priorityScore: difficultyScore + dueScore,
          difficulty,
        });
      }
    }

    return Array.from(topics.values())
      .sort((left, right) => {
        if (right.priorityScore !== left.priorityScore) {
          return right.priorityScore - left.priorityScore;
        }
        if (right.questionCount !== left.questionCount) {
          return right.questionCount - left.questionCount;
        }
        return left.topicName.localeCompare(right.topicName, "vi");
      })
      .slice(0, 6);
  }, [dueRecommendations, subjectNameById, weakTopicByName]);

  const smartReviewStats = useMemo(() => {
    const itemsDueToday = dueRecommendations.length;
    const subjectCount = smartReviewSubjects.length;
    const totalPlannedToday = reviewRecommendations.length > 0 ? reviewRecommendations.length : itemsDueToday;
    const completedToday =
      totalPlannedToday === 0 ? 0 : reviewStats.dueCount > 0
        ? Math.max(0, totalPlannedToday - reviewStats.dueCount)
        : totalPlannedToday;
    const progressPercent =
      totalPlannedToday > 0 ? Math.min(100, Math.round((completedToday / totalPlannedToday) * 100)) : 0;
    const estimatedMinutes =
      itemsDueToday === 0 ? 0 : Math.max(itemsDueToday * 2, smartReviewTopics.length * 4);

    return {
      itemsDueToday,
      subjectCount,
      completedToday,
      totalPlannedToday,
      progressPercent,
      estimatedMinutes,
    };
  }, [dueRecommendations.length, reviewRecommendations.length, reviewStats.dueCount, smartReviewSubjects.length, smartReviewTopics.length]);



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
    const token = getStoredAuthToken();
    const loadPremiumStatus = async () => {
      if (!token || !isStandardUserRole) {
        if (isActive) {
          setIsPremiumUser(false);
        }
        return;
      }
      try {
        const status = await premiumUpgradeService.getStatus();
        if (isActive) setIsPremiumUser(Boolean(status.premium && status.confirmed));
      } catch {
        if (isActive) setIsPremiumUser(false);
      }
    };
    const fetchData = async () => {
      setInsightsLoading(true);
      if (!token) {
        if (isActive) {
          setWeakTopics([]);
          setReviewRecommendations([]);
          setSubjectCatalog([]);
          setCoinBalance(typeof currentUser?.coinBalance === "number" ? currentUser.coinBalance : 0);
          setCurrentStreak(typeof currentUser?.streak === "number" ? currentUser.streak : 0);
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
        const [ranks, topics, recommendations, profile, streak, subjects] = await Promise.all([
          userService.getRankings(),
          userService.getWeakTopics(100),
          userService.getReviewRecommendations(8),
          userService.getMyProfile().catch(() => null),
          userService.getStreakStatus().catch(() => null),
          userService.getSubjectCatalog().catch(() => []),
        ]);
        if (!isActive) return;
        setRankings(ranks);
        setWeakTopics(topics);
        setReviewRecommendations(recommendations);
        setSubjectCatalog(subjects);
        const nextCoinBalance =
          typeof streak?.coinBalance === "number"
            ? streak.coinBalance
            : typeof profile?.coinBalance === "number"
              ? profile.coinBalance
              : typeof currentUser?.coinBalance === "number"
                ? currentUser.coinBalance
                : 0;
        const nextStreak =
          typeof streak?.currentStreak === "number"
            ? streak.currentStreak
            : typeof profile?.streak === "number"
              ? profile.streak
              : typeof currentUser?.streak === "number"
                ? currentUser.streak
                : 0;
        setCoinBalance(nextCoinBalance);
        setCurrentStreak(nextStreak);
      } catch (error) {
        if (isActive) console.error('Error loading data:', error);
      } finally {
        if (isActive) setInsightsLoading(false);
      }
    };
    void loadPremiumStatus();
    fetchData();

    return () => {
      isActive = false;
    };
  }, [currentUser, isStandardUserRole]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* ── HEADER ROW: Greeting & Coins ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Xin chào, {displayName} <span className="inline-block transition-transform hover:rotate-12 duration-300 cursor-default select-none">👋</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Hôm nay bạn muốn học gì?</p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto relative" ref={popoverRef}>
          {/* Coins Pill */}
          <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/30 px-3.5 py-1.5 shadow-sm transition-all hover:bg-amber-50/50 hover:scale-[1.02]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-[0_1.5px_3px_rgba(217,119,6,0.3)]">
              <Coins className="h-3 w-3" strokeWidth={2.8} />
            </span>
            <span className="text-sm font-extrabold text-slate-800 tabular-nums">
              {coinBalance.toLocaleString("vi-VN")}
            </span>
          </div>

                    <div className="flex items-center gap-2 rounded-xl border border-orange-200/70 bg-orange-50/40 px-2.5 py-1.5 shadow-sm transition-all hover:bg-orange-50/70 hover:scale-[1.02]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_1.5px_3px_rgba(234,88,12,0.28)]" title="Chuỗi đăng nhập">
              <Flame className="h-3 w-3" strokeWidth={2.8} fill="currentColor" />
            </span>
            <span className="text-sm font-extrabold text-slate-800 tabular-nums">
              {currentStreak.toLocaleString("vi-VN")}
            </span>
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowRulesPopover(!showRulesPopover)}
            className={`flex h-7.5 w-7.5 items-center justify-center rounded-full transition-all cursor-pointer ${
              showRulesPopover
                ? "bg-slate-800 text-white shadow-md shadow-slate-800/10"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            }`}
            title="Quy tắc nhận coin"
          >
            <span className="font-semibold text-sm">?</span>
          </button>

          {/* Popover */}
          {showRulesPopover && (
            <div className="absolute right-0 top-full mt-2.5 z-50 w-80 rounded-[20px] border border-slate-100 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
              {/* Popover Arrow */}
              <div className="absolute -top-1.5 right-9 h-3 w-3 rotate-45 border-l border-t border-slate-100 bg-white" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-900 text-sm">Quy tắc cộng trừ coin</h4>
                <button
                  type="button"
                  onClick={() => setShowRulesPopover(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* List */}
              <div className="relative z-10 mt-4 space-y-3.5">
                {COIN_RULES.map((rule, idx) => {
                  const RuleIcon = rule.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${rule.iconColor}`}>
                          <RuleIcon className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                        <span className="text-[12.5px] font-medium text-slate-700 truncate">{rule.title}</span>
                      </div>
                      <span className={`text-[12.5px] font-extrabold shrink-0 ${rule.valueColor}`}>{rule.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ── SECTION 1: Hero & Ranking ── */}
      <div className={`grid grid-cols-1 gap-8 ${isStandardUserRole ? "lg:grid-cols-3" : ""}`}>

        {isStandardUserRole ? (
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
                Mở khoá xem tài liệu không giới hạn và truy cập các đề thi premium — tăng tốc hành trình ôn luyện của bạn.
              </p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 max-w-lg">
              {[
                "Xem tài liệu không giới hạn",
                "Truy cập các đề thi premium",
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
        ) : null}

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

      {/* ── SECTION 2: Dashboard Grid (Full Width) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Right Column: Ôn tập thông minh (Full Width) ── */}
        <section className="lg:col-span-12 relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <header className="relative border-b border-slate-100 px-6 py-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100/50">
                <Brain className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-slate-900">Ôn tập thông minh</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Lộ trình cá nhân hóa theo độ quên – Học đúng cái bạn cần vào đúng thời điểm
                </p>
              </div>
            </div>
          </header>

          <div className="relative px-6 py-5">
            {insightsLoading && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`sm2-stat-${index}`} className="h-24 rounded-[18px] bg-slate-100 animate-pulse" />
                  ))}
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <div className="h-72 rounded-[22px] bg-slate-100 animate-pulse" />
                  <div className="h-72 rounded-[22px] bg-slate-100 animate-pulse" />
                </div>
              </div>
            )}

            {!insightsLoading && reviewRecommendations.length === 0 && (
              <div className="flex flex-col items-center rounded-[22px] border border-dashed border-blue-200 bg-white/80 px-6 py-14 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-50 text-blue-600">
                  <Brain className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <p className="text-base font-semibold text-slate-800">Chưa có lịch ôn tập thông minh</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Làm thêm bài và chấm điểm vài lần để hệ thống xây dựng lịch ôn cá nhân hóa theo thuật toán SM-2.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/user/online-exam')}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] transition-colors hover:bg-blue-700 cursor-pointer"
                >
                  <BookOpen className="h-4 w-4" strokeWidth={2.3} />
                  Làm bài để tạo lịch ôn
                </button>
              </div>
            )}

            {!insightsLoading && reviewRecommendations.length > 0 && (
              <>
                {/* Grid of 3 Stat Cards */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  {/* Stat Card 1 */}
                  <div className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-h-[96px]">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-6 w-6 text-blue-600 shrink-0" strokeWidth={2} />
                      <span className="text-2xl font-extrabold tracking-tight text-blue-700 tabular-nums">
                        {smartReviewStats.itemsDueToday.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className="text-[10px] font-normal text-slate-400 leading-tight">Mục cần ôn hôm nay</p>
                    </div>
                  </div>

                  {/* Stat Card 2 */}
                  <div className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-h-[96px]">
                    <div className="flex items-center gap-3">
                      <Library className="h-6 w-6 text-blue-600 shrink-0" strokeWidth={2} />
                      <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                        {smartReviewStats.subjectCount.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className="text-[10px] font-normal text-slate-400 leading-tight">Môn học</p>
                    </div>
                  </div>

                  {/* Stat Card 3 */}
                  <div className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-h-[96px]">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-blue-600 shrink-0" strokeWidth={2} />
                      <span className="text-2xl font-extrabold tracking-tight text-blue-700 tabular-nums">
                        {smartReviewStats.completedToday}/{smartReviewStats.totalPlannedToday}
                      </span>
                    </div>
                    <div className="mt-1 w-full">
                      <p className="text-[10px] font-normal text-slate-400 leading-tight mb-1.5">Đã hoàn thành</p>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${smartReviewStats.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2-Column Content Grid */}
                <div className="mt-6 grid gap-5 md:grid-cols-12">
                  {/* Left Column: Phân bổ theo môn */}
                  <div className="md:col-span-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-900">Phân bổ theo môn</h4>
                    </div>

                    <div className="space-y-3">
                      {smartReviewSubjects.map((subject) => {
                        const visual = getSubjectVisual(subject.name);
                        const SubjectIcon = visual.icon;

                        return (
                          <div
                            key={subject.key}
                            className="flex items-center justify-between gap-3 px-0.5 py-0.5"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${visual.iconBgClass} ${visual.iconClass}`}>
                                <SubjectIcon className="h-4 w-4" strokeWidth={2} />
                              </div>
                              <span className="truncate text-xs font-semibold text-slate-800">
                                {formatSubjectNameWithAccents(subject.name)}
                              </span>
                            </div>
                            <span className={`inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold w-6 h-6 ${visual.badgeClass}`}>
                              {subject.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Đề xuất ưu tiên hôm nay */}
                  <div className="md:col-span-7 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-900">Đề xuất ưu tiên hôm nay</h4>
                    </div>

                    <div className="space-y-2.5">
                      {smartReviewTopics.map((topic, index) => {
                        const subjectVisual = getSubjectVisual(topic.subjectName);

                        return (
                          <button
                            key={topic.key}
                            type="button"
                            onClick={() => navigate(`/user/review?topic=${encodeURIComponent(topic.topicName)}`)}
                            className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/20 px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer"
                          >
                            {/* Index circle */}
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50/50 text-xs font-bold text-blue-600">
                              {index + 1}
                            </div>

                            {/* Title */}
                            <div className="min-w-0 flex-1">
                              <span className="truncate text-xs font-semibold text-slate-800 block">
                                {index + 1}. {topic.topicName}
                              </span>
                            </div>

                            {/* Badges on the right */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-20 shrink-0">
                                <span className={`inline-flex w-full items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${subjectVisual.badgeClass}`}>
                                  {formatSubjectNameWithAccents(topic.subjectName)}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Centered blue link */}
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => navigate('/user/review')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
                      >
                        Xem tất cả {smartReviewStats.totalPlannedToday} mục
                        <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center justify-center border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => navigate('/user/review')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto"
                  >
                    <Rocket className="h-4 w-4" strokeWidth={2} />
                    Bắt đầu ôn tập
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

      </div>

    </div>
  );
}
