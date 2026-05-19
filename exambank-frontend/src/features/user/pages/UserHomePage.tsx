
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Info, 
  Award,
  Brain,
  Sparkles,
  Timer
} from "lucide-react";
import type { Ranking, ReviewRecommendation, WeakTopicInsight } from '../types/user.type';
import { userService } from '../services/user.service';

const SOURCE_LABELS: Record<string, string> = {
  DUE_REVIEW: "Đến hạn",
  WEAK_TOPIC: "Điểm yếu",
};

const MEMORY_LABELS: Record<string, { label: string; tone: string }> = {
  FORGOTTEN: { label: "Quên", tone: "bg-rose-100 text-rose-700" },
  HARD: { label: "Khó", tone: "bg-amber-100 text-amber-700" },
  REMEMBERED: { label: "Đã nhớ", tone: "bg-emerald-100 text-emerald-700" },
  EASY: { label: "Dễ", tone: "bg-teal-100 text-teal-700" },
};

const stripHtml = (value: string): string => {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const formatPercent = (value: number): string => {
  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(normalized)}%`;
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

  useEffect(() => {
    let isActive = true;
    const fetchData = async () => {
      setInsightsLoading(true);
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
    fetchData();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      
      {/* SECTION 1: Hero & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Banner Progress */}
        <section className="lg:col-span-2 bg-white p-8 rounded-2xl relative overflow-hidden shadow-sm border border-slate-100 group transition-all hover:shadow-md">
          {/* Hình tròn trang trí phía sau */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-500" />
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                Tiếp tục lộ trình
              </span>
              <h2 className="text-3xl font-extrabold text-[#003466] mt-4 leading-tight max-w-md">
                Luyện thi Đánh giá năng lực ĐHQG-HCM
              </h2>
              <p className="text-slate-500 mt-2 max-w-sm">
                Bạn đã hoàn thành 65% chặng đường. Chỉ còn 12 bài học để đạt mục tiêu 850+.
              </p>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-tighter">Tiến độ tổng quan</span>
                <span className="text-xs font-bold text-blue-800">65%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: "65%" }}
                />
              </div>
              <button
                onClick={() => navigate('/user/exambank')}
                className="mt-6 bg-gradient-to-r from-[#003466] to-[#1a4b84] hover:opacity-90 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                Làm bài ngay
              </button>
            </div>
          </div>
        </section>

        {/* Radar Chart (Năng lực) */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Phân tích năng lực</h3>
            <Info className="w-4 h-4 text-slate-300 cursor-help" />
          </div>
          <div className="flex items-center justify-center py-4">
             {/* Simple SVG Radar Mockup */}
             <div className="relative w-44 h-44">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-30">
                   {/* Background Polygons */}
                   <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                   <polygon points="50,25 75,35 75,65 50,75 25,65 25,35" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                   {/* Data Shape */}
                   <polygon 
                      points="50,15 85,35 80,70 50,85 20,65 15,40" 
                      fill="rgba(0, 52, 102, 0.15)" 
                      stroke="#003466" 
                      strokeWidth="2" 
                    />
                </svg>
                {/* Labels (Absolute Positioning) */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 uppercase">Toán</div>
                <div className="absolute top-1/4 -right-6 text-[9px] font-bold text-slate-400 uppercase">Logic</div>
                <div className="absolute bottom-1/4 -right-8 text-[9px] font-bold text-slate-400 uppercase">Tiếng Anh</div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 uppercase">Văn học</div>
             </div>
          </div>
        </section>
      </div>

      {/* SECTION 2: Weakness & SM-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-5 bg-[linear-gradient(135deg,#ffffff_0%,#f6f9ff_45%,#eef4ff_100%)] p-6 rounded-[28px] border border-slate-100 shadow-[0_18px_40px_rgba(15,76,147,0.12)] relative overflow-hidden">
          <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-[radial-gradient(circle,_rgba(31,99,180,0.22)_0%,_rgba(31,99,180,0)_70%)]" />
          <div className="absolute bottom-6 left-6 w-20 h-20 rounded-full border border-blue-200/40" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-blue-700 font-semibold">Gợi ý điểm yếu</p>
                <h3 className="text-2xl text-slate-900 mt-2" style={{ fontFamily: "var(--font-display)" }}>
                  Lộ trình cá nhân hoá
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Ưu tiên các chuyên đề có tỉ lệ đúng thấp nhất để tối ưu điểm số nhanh.
                </p>
              </div>
              <div className="flex items-center gap-2 text-blue-700 bg-white/80 px-3 py-2 rounded-full text-xs font-semibold shadow-sm">
                <Sparkles className="w-4 h-4" />
                AI Insight
              </div>
            </div>

            {insightsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`weak-skeleton-${index}`} className="h-16 rounded-2xl bg-white/70 animate-pulse" />
                ))}
              </div>
            )}

            {!insightsLoading && weakTopics.length === 0 && (
              <div className="bg-white/80 border border-dashed border-blue-200 rounded-2xl p-5 text-sm text-slate-500">
                Chưa có dữ liệu điểm yếu. Hoàn thành vài bài để hệ thống gợi ý chính xác hơn.
              </div>
            )}

            {!insightsLoading && weakTopics.length > 0 && (
              <div className="space-y-4">
                {weakTopics.slice(0, 5).map((topic, index) => {
                  const accuracy = topic.accuracyRate;
                  const tone = accuracy < 0.5 ? "bg-rose-500" : accuracy < 0.7 ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <div
                      key={`${topic.topicTag}-${index}`}
                      className="bg-white/85 backdrop-blur rounded-2xl p-4 border border-white shadow-[0_10px_26px_rgba(15,76,147,0.08)] animate-in fade-in slide-in-from-bottom-2 duration-700"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{topic.topicTag}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Đúng {topic.correctCount}/{topic.totalAttempts} • {formatPercent(accuracy)}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-600">{formatPercent(accuracy)}</span>
                      </div>
                      <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${tone} transition-all`} style={{ width: formatPercent(accuracy) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-7 bg-gradient-to-br from-[#0b3b78] via-[#0f4c93] to-[#0b2b55] p-6 rounded-[28px] border border-[#0f4c93]/40 text-white shadow-[0_20px_50px_rgba(11,59,120,0.35)] relative overflow-hidden">
          <div className="absolute -top-12 right-10 w-36 h-36 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.25)_0%,_rgba(255,255,255,0)_70%)]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[radial-gradient(circle,_rgba(31,138,92,0.35)_0%,_rgba(31,138,92,0)_70%)]" />
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/70 font-semibold">SM-2 Review</p>
                <h3 className="text-2xl mt-2" style={{ fontFamily: "var(--font-display)" }}>
                  Lịch ôn tập thông minh
                </h3>
                <p className="text-sm text-white/70 mt-2 max-w-md">
                  Thuật toán SM-2 tự động điều chỉnh lịch ôn dựa trên mức độ ghi nhớ của bạn.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/15 px-4 py-2 rounded-full text-xs font-semibold">
                <Brain className="w-4 h-4" />
                {reviewStats.dueCount} câu đến hạn
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                <p className="text-xs text-white/60">Ôn tiếp theo</p>
                <p className="text-sm font-semibold mt-2">{formatDate(reviewStats.nextReviewDate)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                <p className="text-xs text-white/60">Ease Factor TB</p>
                <p className="text-sm font-semibold mt-2">{reviewStats.avgEase > 0 ? reviewStats.avgEase.toFixed(2) : "--"}</p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-4 flex items-center gap-3">
                <Timer className="w-6 h-6 text-emerald-200" />
                <div>
                  <p className="text-xs text-white/60">Đề xuất hôm nay</p>
                  <p className="text-sm font-semibold mt-1">{reviewRecommendations.length} câu</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {insightsLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`review-skeleton-${index}`} className="h-16 rounded-2xl bg-white/10 animate-pulse" />
                  ))}
                </div>
              )}

              {!insightsLoading && reviewRecommendations.length === 0 && (
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/70">
                  Chưa có gợi ý ôn tập. Hãy hoàn thành thêm bài để hệ thống xếp lịch SM-2.
                </div>
              )}

              {!insightsLoading && reviewRecommendations.length > 0 && (
                <div className="space-y-3">
                  {reviewRecommendations.slice(0, 4).map((item, index) => {
                    const content = stripHtml(item.content);
                    const snippet = content.length > 120 ? `${content.slice(0, 120)}...` : content;
                    const sourceLabel = item.source ? SOURCE_LABELS[item.source] ?? item.source : "Đề xuất";
                    const memoryMeta = item.memoryLevel ? MEMORY_LABELS[item.memoryLevel] : null;
                    return (
                      <div
                        key={`${item.questionId}-${index}`}
                        className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700"
                        style={{ animationDelay: `${index * 90}ms` }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                              {sourceLabel}
                            </span>
                            {item.due && <span className="text-[10px] font-semibold bg-emerald-400/20 text-emerald-100 px-2 py-1 rounded-full">Đến hạn</span>}
                            {memoryMeta && (
                              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${memoryMeta.tone}`}>
                                {memoryMeta.label}
                              </span>
                            )}
                          </div>
                          {item.nextReviewDate && (
                            <span className="text-[10px] text-white/60">{formatDate(item.nextReviewDate)}</span>
                          )}
                        </div>
                        <p className="text-sm text-white/90 leading-snug">
                          {snippet || "Câu hỏi ưu tiên cho lịch ôn tập của bạn."}
                        </p>
                        {item.topicTags.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-[10px] text-white/70">
                            {item.topicTags.slice(0, 3).map((tag) => (
                              <span key={`${item.questionId}-${tag}`} className="px-2 py-1 rounded-full bg-white/10">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/user/exambank')}
                className="bg-white text-[#0b3b78] px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-white/20 transition-all hover:-translate-y-0.5"
              >
                Bắt đầu ôn tập
              </button>
              <span className="text-xs text-white/60">Tự động đồng bộ theo lịch SM-2 của bạn.</span>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 3: Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ranking */}
        <section className="lg:col-span-12 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 px-2">Xếp hạng tuần</h3>
          
          <div className="space-y-2 flex-1">
            {rankings.map((item) => (
              <div key={item.rank} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs
                  ${item.rank === 1 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                  {item.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-100 shadow-sm">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} alt="avatar" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-700">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {item.score} điểm
                  </p>
                </div>
                {item.rank === 1 && <Award className="w-5 h-5 text-amber-500 fill-amber-500/20" />}
              </div>
            ))}
            {rankings.length === 0 && (
              <p className="px-2 text-sm text-slate-400">Chưa có dữ liệu bảng xếp hạng.</p>
            )}
          </div>

          {/* User Rank Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100">
             <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner shadow-blue-100/50">
                <div className="w-8 h-8 flex items-center justify-center font-black text-blue-700">12</div>
                <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xs">
                   MH
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-blue-900 leading-none">Bạn (Minh Hoàng)</p>
                  <p className="text-[10px] text-blue-700/60 mt-1 font-bold italic">842/1200 điểm</p>
                </div>
                <span className="text-xs font-black text-emerald-600">+5</span>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
