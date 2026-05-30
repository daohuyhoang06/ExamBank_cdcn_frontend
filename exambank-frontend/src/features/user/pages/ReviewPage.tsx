/**
 * ReviewPage — hai chế độ:
 *  1. /user/review            → Ôn tập thông minh (SM-2, DUE_REVIEW + WEAK_TOPIC)
 *  2. /user/review?topic=X    → Luyện tập chủ đề X (lọc câu hỏi theo topicTag)
 *  3. /user/review?questionId=123 → Ôn đúng 1 câu hỏi được chọn từ trang chủ
 *     &accuracy=0.45          → tỉ lệ đúng hiện tại (0-1)
 *     &total=20               → tổng số lần thử
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Target,
  Clock,
  Flame,
  BookOpen,
  TrendingUp,
  RefreshCcw,
  Lightbulb,
  Calendar,
} from 'lucide-react';
import type { ReviewRecommendation } from '../types/user.type';
import { userService } from '../services/user.service';

/* ─── constants ─────────────────────────────────────────────── */

const QUALITY_LEVELS = [
  {
    value: 1,
    label: 'Quên mất',
    sublabel: 'Không nhớ gì',
    cls: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300',
    activeCls: 'border-rose-400 bg-rose-100',
    dot: 'bg-rose-400',
  },
  {
    value: 2,
    label: 'Còn khó',
    sublabel: 'Nhớ mờ, chưa chắc',
    cls: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300',
    activeCls: 'border-amber-400 bg-amber-100',
    dot: 'bg-amber-400',
  },
  {
    value: 4,
    label: 'Nhớ được',
    sublabel: 'Hơi chần chừ',
    cls: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300',
    activeCls: 'border-blue-400 bg-blue-100',
    dot: 'bg-blue-400',
  },
  {
    value: 5,
    label: 'Dễ nhớ',
    sublabel: 'Nhớ ngay, chắc chắn',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300',
    activeCls: 'border-emerald-400 bg-emerald-100',
    dot: 'bg-emerald-400',
  },
] as const;

const MEMORY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ReactNode }
> = {
  FORGOTTEN: {
    label: 'Đã quên',
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    icon: <RotateCcw className="w-3 h-3" strokeWidth={2.5} />,
  },
  HARD: {
    label: 'Còn khó',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />,
  },
  REMEMBERED: {
    label: 'Đã nhớ',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: <Check className="w-3 h-3" strokeWidth={2.5} />,
  },
  EASY: {
    label: 'Dễ nhớ',
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    icon: <Sparkles className="w-3 h-3" strokeWidth={2.5} />,
  },
};

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* ─── helpers ────────────────────────────────────────────────── */

const parseOptions = (raw?: string): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const o = item as Record<string, unknown>;
          return String(o.text ?? o.content ?? o.value ?? o.label ?? JSON.stringify(item));
        }
        return String(item);
      });
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.values(parsed as Record<string, unknown>).map(String);
    }
  } catch {
    const lines = raw.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
    if (lines.length > 1) return lines;
  }
  return [];
};

const normalizeText = (value?: string): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const stripAnswerPrefix = (value: string): string =>
  value
    .trim()
    .replace(/^(đáp\s*án|dap\s*an|answer|correct\s*answer)\s*[:\-]?\s*/i, '')
    .trim();

const parseAnswerTokens = (raw?: string): string[] => {
  if (!raw) return [];
  const cleaned = raw.trim();
  if (!cleaned) return [];

  const tokensFromString = (source: string): string[] => {
    const parts = source
      .split(/[\n,;|]/)
      .map((item) => stripAnswerPrefix(item))
      .filter(Boolean);
    return parts.length > 0 ? parts : [stripAnswerPrefix(source)];
  };

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .flatMap((item) => tokensFromString(String(item)))
        .filter(Boolean);
    }
    if (typeof parsed === 'string') {
      return tokensFromString(parsed);
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.values(parsed as Record<string, unknown>)
        .flatMap((item) => tokensFromString(String(item)))
        .filter(Boolean);
    }
  } catch {
    // raw answer is plain text
  }

  return tokensFromString(cleaned);
};

const isTrueLike = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = normalizeText(value);
    return normalized === 'true'
      || normalized === '1'
      || normalized === 'yes'
      || normalized === 'y'
      || normalized === 'dung'
      || normalized === 'đúng'
      || normalized === 'correct';
  }
  return false;
};

const resolveCorrectIndexesFromOptionFlags = (raw?: string): number[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const entries = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null
      ? Object.values(parsed as Record<string, unknown>)
      : [];
    const indexes = new Set<number>();
    entries.forEach((entry, idx) => {
      if (typeof entry !== 'object' || entry === null) return;
      const option = entry as Record<string, unknown>;
      if (
        isTrueLike(option.isCorrect)
        || isTrueLike(option.correct)
        || isTrueLike(option.isAnswer)
        || isTrueLike(option.right)
      ) {
        indexes.add(idx);
      }
    });
    return Array.from(indexes).sort((a, b) => a - b);
  } catch {
    return [];
  }
};

const resolveCorrectOptionIndexes = (answer?: string, options: string[] = []): number[] => {
  if (!answer || options.length === 0) return [];

  const indexes = new Set<number>();
  const normalizedOptions = options.map((opt) => normalizeText(opt));

  parseAnswerTokens(answer).forEach((token) => {
    const trimmed = token.trim();
    if (!trimmed) return;

    const normalized = normalizeText(trimmed);
    const asNumber = Number(normalized);
    if (!Number.isNaN(asNumber)) {
      if (asNumber >= 0 && asNumber < options.length) {
        indexes.add(asNumber);
        return;
      }
      if (asNumber >= 1 && asNumber <= options.length) {
        indexes.add(asNumber - 1);
        return;
      }
    }

    if (/^[A-Za-z]$/.test(trimmed)) {
      const idx = trimmed.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) {
        indexes.add(idx);
        return;
      }
    }

    const leadingLetterMatch = trimmed.match(/^([A-Za-z])[\.\):\-\s]/);
    if (leadingLetterMatch) {
      const idx = leadingLetterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) {
        indexes.add(idx);
        return;
      }
    }

    const trailingLetterMatch = stripAnswerPrefix(trimmed).match(/([A-Za-z])$/);
    if (trailingLetterMatch) {
      const idx = trailingLetterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) {
        indexes.add(idx);
        return;
      }
    }

    const exactIndex = normalizedOptions.findIndex((opt) => opt === normalized);
    if (exactIndex >= 0) {
      indexes.add(exactIndex);
    }
  });

  return Array.from(indexes).sort((a, b) => a - b);
};

const formatCorrectAnswer = (answer?: string, options: string[] = []): string => {
  const indexes = resolveCorrectOptionIndexes(answer, options);
  if (indexes.length > 0) {
    return indexes
      .map((idx) => `${OPTION_LABELS[idx] ?? String(idx + 1)}${options[idx] ? `. ${options[idx]}` : ''}`)
      .join(' | ');
  }
  return answer?.trim() || 'Không xác định';
};

const getTopicString = (tag: unknown): string => {
  if (typeof tag === 'string') return tag;
  if (typeof tag === 'object' && tag !== null) {
    return String((tag as Record<string, unknown>).name ?? JSON.stringify(tag));
  }
  return String(tag);
};

const matchesTopic = (q: ReviewRecommendation, topicFilter: string): boolean => {
  if (!Array.isArray(q.topicTags)) return false;
  const norm = topicFilter.toLowerCase().trim();
  return q.topicTags.some((tag) => {
    const t = getTopicString(tag).toLowerCase().trim();
    return t === norm || t.includes(norm) || norm.includes(t);
  });
};

const formatPercent = (v: number) => `${Math.round(v > 1 ? v : v * 100)}%`;

/* ─── types ─────────────────────────────────────────────────── */

type ReviewPhase = 'loading' | 'thinking' | 'rating' | 'submitting' | 'done' | 'empty';

/* ─── sub-components ─────────────────────────────────────────── */

function PageShell({ children, accent = 'blue' }: { children: React.ReactNode; accent?: 'blue' | 'rose' }) {
  return (
    <div className={`min-h-[calc(100vh-80px)] ${accent === 'rose' ? 'bg-rose-50/40' : 'bg-slate-50/70'} px-4 pt-6 pb-12`}>
      <div className="max-w-2xl mx-auto">
        {children}
      </div>
    </div>
  );
}

function LoadingSkeleton({ isTopicMode, topicFilter }: { isTopicMode: boolean; topicFilter: string }) {
  return (
    <PageShell accent={isTopicMode ? 'rose' : 'blue'}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-5">
        <div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-6 w-36 bg-slate-200 rounded-full animate-pulse" />
        <div className="h-6 w-12 bg-slate-200 rounded-lg animate-pulse" />
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full mb-5 animate-pulse" />
      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <div className="h-6 w-16 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-6 w-24 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="px-6 py-6 space-y-3">
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-full" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-5/6" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-3/5" />
        </div>
        <div className="px-6 pb-5 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="px-6 pb-6">
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-4">
        {isTopicMode ? `Đang tải câu hỏi cho "${topicFilter}"…` : 'Đang tải lịch ôn tập của bạn…'}
      </p>
    </PageShell>
  );
}

/* ─── component ─────────────────────────────────────────────── */

export default function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL params
  const topicFilter = searchParams.get('topic') ?? '';
  const topicAccuracy = searchParams.get('accuracy') ? parseFloat(searchParams.get('accuracy')!) : null;
  const topicTotal = searchParams.get('total') ? parseInt(searchParams.get('total')!, 10) : null;
  const selectedQuestionId = searchParams.get('questionId')
    ? parseInt(searchParams.get('questionId')!, 10)
    : null;
  const isSingleQuestionMode = Number.isInteger(selectedQuestionId) && (selectedQuestionId ?? 0) > 0;
  const isTopicMode = Boolean(topicFilter);

  // State
  const [questions, setQuestions] = useState<ReviewRecommendation[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [qualityResults, setQualityResults] = useState<Record<number, number>>({});
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [isSelectedAnswerCorrect, setIsSelectedAnswerCorrect] = useState<boolean | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setPhase('loading');
    setCurrentIndex(0);
    setQualityResults({});
    setUsedFallback(false);

    const load = async () => {
      try {
        const data = await userService.getReviewRecommendations();
        if (!mountedRef.current) return;

        let resolved: ReviewRecommendation[] = data;
        let fallback = false;

        if (isSingleQuestionMode && selectedQuestionId) {
          resolved = data.filter((q) => q.questionId === selectedQuestionId);
        } else if (isTopicMode) {
          const matched = data.filter((q) => matchesTopic(q, topicFilter));
          if (matched.length > 0) {
            resolved = matched;
          } else {
            const weakOnes = data.filter((q) => q.source === 'WEAK_TOPIC');
            resolved = weakOnes.length > 0 ? weakOnes : data;
            fallback = weakOnes.length > 0 || data.length > 0;
          }
        }

        const missingAnswerIds = resolved
          .filter((q) => !(q.answer && q.answer.trim().length > 0))
          .map((q) => q.questionId)
          .filter((id) => Number.isFinite(id) && id > 0);
        if (missingAnswerIds.length > 0) {
          const fallbackEntries = await Promise.all(
            Array.from(new Set(missingAnswerIds)).map((questionId) =>
              userService.getQuestionReviewFallback(questionId),
            ),
          );
          const fallbackMap = new Map(
            fallbackEntries
              .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
              .map((entry) => [entry.questionId, entry]),
          );
          resolved = resolved.map((q) => {
            const fallback = fallbackMap.get(q.questionId);
            if (!fallback) return q;
            return {
              ...q,
              answer: q.answer && q.answer.trim().length > 0 ? q.answer : fallback.answer,
              options: q.options ?? fallback.options,
            };
          });
        }

        setQuestions(resolved);
        setUsedFallback(fallback);
        setPhase(resolved.length > 0 ? 'thinking' : 'empty');
      } catch {
        if (mountedRef.current) setPhase('empty');
      }
    };

    void load();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicFilter, isSingleQuestionMode, selectedQuestionId]);

  const totalCount = questions.length;
  const currentQuestion = questions[currentIndex];
  const options = parseOptions(currentQuestion?.options);
  const correctOptionIndexes = useMemo(() => {
    const fromAnswer = resolveCorrectOptionIndexes(currentQuestion?.answer, options);
    const fromOptions = resolveCorrectIndexesFromOptionFlags(currentQuestion?.options);
    return Array.from(new Set([...fromAnswer, ...fromOptions])).sort((a, b) => a - b);
  }, [currentQuestion?.answer, currentQuestion?.options, options]);
  const progressPercent = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0;

  useEffect(() => {
    setSelectedOptionIndex(null);
    setAnswerChecked(false);
    setIsSelectedAnswerCorrect(null);
  }, [currentQuestion?.questionId]);

  const handleFlip = () => {
    if (selectedOptionIndex === null) return;
    const hasAnswerKey = correctOptionIndexes.length > 0 || Boolean(currentQuestion?.answer?.trim());
    const correct = hasAnswerKey ? correctOptionIndexes.includes(selectedOptionIndex) : null;
    setAnswerChecked(true);
    setIsSelectedAnswerCorrect(correct);
    setPhase('rating');
  };

  const handleRate = useCallback(
    async (quality: number) => {
      if (!currentQuestion) return;
      setPhase('submitting');
      try {
        await userService.recordSm2ReviewResult(currentQuestion.questionId, quality);
      } catch {
        // best-effort
      }
      if (!mountedRef.current) return;
      setQualityResults((prev) => ({ ...prev, [currentQuestion.questionId]: quality }));
      const next = currentIndex + 1;
      if (next >= totalCount) {
        setPhase('done');
      } else {
        setCurrentIndex(next);
        setPhase('thinking');
      }
    },
    [currentQuestion, currentIndex, totalCount],
  );

  const summaryStats = useMemo(() => {
    const vals = Object.values(qualityResults);
    const good = vals.filter((v) => v >= 4).length;
    return {
      total: vals.length,
      forgot: vals.filter((v) => v <= 1).length,
      hard: vals.filter((v) => v === 2).length,
      remembered: vals.filter((v) => v === 4).length,
      easy: vals.filter((v) => v >= 5).length,
      goodRate: vals.length > 0 ? good / vals.length : 0,
    };
  }, [qualityResults]);

  const estimatedNewAccuracy = useMemo(() => {
    if (topicAccuracy === null || topicTotal === null || summaryStats.total === 0) return null;
    const prevCorrect = Math.round(topicAccuracy * topicTotal);
    const newCorrect = prevCorrect + summaryStats.remembered + summaryStats.easy;
    const newTotal = topicTotal + summaryStats.total;
    return newCorrect / newTotal;
  }, [topicAccuracy, topicTotal, summaryStats]);

  /* ── loading ── */
  if (phase === 'loading') {
    return <LoadingSkeleton isTopicMode={isTopicMode} topicFilter={topicFilter} />;
  }

  /* ── empty state ── */
  if (phase === 'empty') {
    return (
      <div className={`min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-8 ${isTopicMode ? 'bg-rose-50/40' : 'bg-slate-50/70'} animate-in fade-in duration-500`}>
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_24px_rgba(15,23,42,0.09)] overflow-hidden">

            {/* Top accent bar */}
            <div className={`h-1.5 w-full ${isTopicMode ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 'bg-gradient-to-r from-blue-400 to-indigo-600'}`} />

            <div className="p-8 text-center">
              {/* Icon */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
                isTopicMode ? 'bg-rose-50 ring-4 ring-rose-100' : 'bg-blue-50 ring-4 ring-blue-100'
              }`}>
                {isTopicMode ? (
                  <Target className="w-10 h-10 text-rose-400" strokeWidth={1.5} />
                ) : (
                  <Brain className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
                )}
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-2">
                {isTopicMode
                  ? `Chưa có câu hỏi cho "${topicFilter}"`
                  : isSingleQuestionMode
                  ? 'Không tìm thấy câu hỏi đã chọn'
                  : 'Chưa có lịch ôn tập'}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {isTopicMode
                  ? 'Câu hỏi sẽ xuất hiện sau khi bạn làm bài và hệ thống ghi nhận kết quả của chủ đề này.'
                  : isSingleQuestionMode
                  ? 'Câu hỏi này hiện không nằm trong danh sách ôn tập thông minh. Hãy chọn câu khác hoặc ôn toàn bộ lịch.'
                  : 'Hoàn thành vài bài thi để hệ thống xây dựng lịch ôn cá nhân hóa cho bạn.'}
              </p>

              {/* Feature explainer — SM-2 mode only */}
              {!isTopicMode && (
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-6 text-left space-y-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Ôn tập thông minh hoạt động thế nào?
                  </p>
                  {[
                    { icon: <Brain className="w-3.5 h-3.5" strokeWidth={2} />, text: 'Tự động lên lịch câu hỏi theo thuật toán ghi nhớ SM-2', color: 'bg-blue-50 text-blue-500' },
                    { icon: <Target className="w-3.5 h-3.5" strokeWidth={2} />, text: 'Ưu tiên chủ đề bạn còn yếu từ lịch sử làm bài', color: 'bg-rose-50 text-rose-500' },
                    { icon: <Calendar className="w-3.5 h-3.5" strokeWidth={2} />, text: 'Điều chỉnh khoảng cách ôn dựa trên khả năng ghi nhớ của bạn', color: 'bg-emerald-50 text-emerald-500' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${f.color}`}>
                        {f.icon}
                      </span>
                      <p className="text-[12.5px] text-slate-600 leading-relaxed">{f.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Topic mode hint */}
              {isTopicMode && (
                <div className="bg-rose-50 rounded-xl border border-rose-100 p-4 mb-6 text-left">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb className="w-3.5 h-3.5 text-rose-500" strokeWidth={2} />
                    </span>
                    <p className="text-[12.5px] text-rose-700 leading-relaxed">
                      Bạn có thể tìm đề thi liên quan đến chủ đề <span className="font-semibold">"{topicFilter}"</span> trong ngân hàng đề để bắt đầu luyện tập.
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/user')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                  Về trang chủ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      isTopicMode
                        ? `/user/exambank?q=${encodeURIComponent(topicFilter)}`
                        : '/user/exambank',
                    )
                  }
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors ${
                    isTopicMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <BookOpen className="w-4 h-4" strokeWidth={2} />
                  {isTopicMode ? 'Tìm đề thi liên quan' : 'Vào ngân hàng đề'}
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── completion screen ── */
  if (phase === 'done') {
    const improved = estimatedNewAccuracy !== null && topicAccuracy !== null
      && estimatedNewAccuracy > topicAccuracy;
    const isGoodSession = summaryStats.goodRate >= 0.6;

    return (
      <div className={`min-h-[calc(100vh-80px)] ${isTopicMode ? 'bg-rose-50/40' : 'bg-slate-50/70'} px-4 pt-6 pb-12 animate-in fade-in duration-500`}>
        <div className="max-w-lg mx-auto">

          {/* Back nav */}
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Về trang chủ
          </button>

          {/* Result card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_24px_rgba(15,23,42,0.09)] overflow-hidden mb-4">

            {/* Accent bar */}
            <div className={`h-1.5 w-full ${
              isGoodSession
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`} />

            <div className="p-7 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                isGoodSession ? 'bg-emerald-50 ring-4 ring-emerald-100' : 'bg-amber-50 ring-4 ring-amber-100'
              }`}>
                {isGoodSession ? (
                  <TrendingUp className="w-8 h-8 text-emerald-600" strokeWidth={2} />
                ) : (
                  <RefreshCcw className="w-8 h-8 text-amber-600" strokeWidth={2} />
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                {isTopicMode ? 'Hoàn thành luyện tập!' : 'Phiên ôn tập xong!'}
              </h2>
              {isTopicMode && (
                <p className="text-sm text-slate-500 mb-1">Chủ đề: <span className="font-semibold text-slate-700">{topicFilter}</span></p>
              )}
              <p className="text-slate-500 text-sm mt-1.5">
                Bạn vừa ôn <span className="font-semibold text-slate-700">{summaryStats.total} câu hỏi</span>.{' '}
                Hệ thống đã cập nhật lịch ôn phù hợp.
              </p>
            </div>
          </div>

          {/* Stats breakdown */}
          {summaryStats.total > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.05)] p-5 mb-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Kết quả phiên ôn</p>
              <div className="grid grid-cols-4 gap-2.5">
                {(
                  [
                    { label: 'Quên mất', count: summaryStats.forgot, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
                    { label: 'Còn khó', count: summaryStats.hard, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                    { label: 'Nhớ được', count: summaryStats.remembered, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                    { label: 'Dễ nhớ', count: summaryStats.easy, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                  ] as const
                ).map((s) => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg} ${s.border}`}>
                    <p className={`text-2xl font-bold tabular-nums leading-none ${s.text}`}>{s.count}</p>
                    <p className={`text-[10px] font-medium mt-1.5 leading-tight ${s.text} opacity-80`}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Accuracy improvement estimate */}
              {isTopicMode && topicAccuracy !== null && estimatedNewAccuracy !== null && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2.5">Ước tính độ chính xác chủ đề này</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
                        <span>Trước: {formatPercent(topicAccuracy)}</span>
                        <span className={improved ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                          {improved ? '↑ ' : ''}{formatPercent(estimatedNewAccuracy)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            estimatedNewAccuracy >= 0.7 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: formatPercent(estimatedNewAccuracy) }}
                        />
                      </div>
                    </div>
                    {improved && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                        Cải thiện!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isTopicMode ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/user/review?topic=${encodeURIComponent(topicFilter)}${
                      topicAccuracy !== null ? `&accuracy=${estimatedNewAccuracy ?? topicAccuracy}` : ''
                    }${topicTotal !== null ? `&total=${(topicTotal ?? 0) + summaryStats.total}` : ''}`,
                  )
                }
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" strokeWidth={2} />
                Luyện tiếp chủ đề này
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/user/review')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" strokeWidth={2} />
                Ôn tập thêm
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/user/exambank')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              <BookOpen className="w-4 h-4" strokeWidth={2} />
              Ngân hàng đề
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const mem = currentQuestion.memoryLevel ? MEMORY_CONFIG[currentQuestion.memoryLevel] : null;
  const isRating = phase === 'rating' || phase === 'submitting';

  /* ── main review UI ── */
  return (
    <PageShell accent={isTopicMode ? 'rose' : 'blue'}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => navigate('/user')}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Quay lại
        </button>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          isTopicMode
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {isTopicMode ? (
            <><Target className="w-3.5 h-3.5" strokeWidth={2} /><span className="max-w-[140px] truncate">{topicFilter}</span></>
          ) : (
            <><Brain className="w-3.5 h-3.5" strokeWidth={2} />Ôn tập thông minh</>
          )}
        </div>

        <span className="text-sm font-bold text-slate-400 tabular-nums">
          {currentIndex + 1}<span className="text-slate-300">/</span>{totalCount}
        </span>
      </div>

      {/* ── Topic mode: accuracy banner ── */}
      {isTopicMode && topicAccuracy !== null && (
        <div
          className={`rounded-xl border px-4 py-3 mb-4 ${
            topicAccuracy < 0.5
              ? 'bg-rose-50 border-rose-200'
              : topicAccuracy < 0.7
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                topicAccuracy < 0.5 ? 'text-rose-700' : topicAccuracy < 0.7 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {topicAccuracy < 0.5 ? (
                <><Flame className="w-3.5 h-3.5" strokeWidth={2.5} />Cần ôn gấp</>
              ) : topicAccuracy < 0.7 ? (
                <><AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />Cần cải thiện</>
              ) : (
                <><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Đang tiến bộ</>
              )}
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                topicAccuracy < 0.5 ? 'text-rose-700' : topicAccuracy < 0.7 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {formatPercent(topicAccuracy)}
              {topicTotal !== null && (
                <span className="text-[11px] font-normal opacity-70 ml-1.5">
                  ({Math.round(topicAccuracy * topicTotal)}/{topicTotal} câu đúng)
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                topicAccuracy < 0.5 ? 'bg-rose-500' : topicAccuracy < 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: formatPercent(topicAccuracy) }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Mục tiêu: đạt ≥&nbsp;70% để chủ đề này không còn là điểm yếu
          </p>
        </div>
      )}

      {/* ── Fallback notice ── */}
      {isTopicMode && usedFallback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-amber-700 leading-relaxed">
            Chưa có câu hỏi chính xác cho <span className="font-semibold">"{topicFilter}"</span>. Hiển thị câu hỏi từ các điểm yếu khác để bạn luyện tập.
          </p>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div className="h-1.5 bg-slate-200 rounded-full mb-5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isTopicMode ? 'bg-rose-500' : 'bg-blue-500'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Question card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_16px_rgba(15,23,42,0.08)] overflow-hidden">

        {/* Top accent line */}
        <div className={`h-0.5 ${isTopicMode ? 'bg-rose-500' : 'bg-blue-500'}`} />

        {/* Badges */}
        <div className="px-6 pt-4 pb-3 flex items-center gap-2 flex-wrap border-b border-slate-100">
          {mem && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${mem.bg} ${mem.text}`}>
              {mem.icon}
              {mem.label}
            </span>
          )}
          {!isTopicMode && (
            currentQuestion.source === 'WEAK_TOPIC' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-rose-50 text-rose-600">
                <Target className="w-3 h-3" strokeWidth={2.5} />
                Điểm yếu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="w-3 h-3" strokeWidth={2.5} />
                Đến hạn ôn
              </span>
            )
          )}
          {Array.isArray(currentQuestion.topicTags) &&
            currentQuestion.topicTags.slice(0, 2).map((tag) => (
              <span
                key={getTopicString(tag)}
                className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg"
              >
                {getTopicString(tag)}
              </span>
            ))}
          {(currentQuestion.repetitionCount ?? 0) > 0 && (
            <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
              Lần ôn thứ {(currentQuestion.repetitionCount ?? 0) + 1}
            </span>
          )}
        </div>

        {/* Question content */}
        <div className="px-6 py-5">
          <div
            className="text-slate-800 text-[15px] leading-relaxed prose prose-sm max-w-none"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
          />
          {currentQuestion.imageUrl && (
            <img
              src={currentQuestion.imageUrl}
              alt="Hình minh hoạ"
              className="mt-4 max-h-52 rounded-xl object-contain border border-slate-100 w-full"
            />
          )}
        </div>

        {/* Options */}
        {options.length > 0 && (
          <div className="px-6 pb-5 grid grid-cols-1 gap-2">
            {options.map((opt, i) => (
              <button
                key={`opt-${i}`}
                type="button"
                disabled={answerChecked}
                onClick={() => setSelectedOptionIndex(i)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border text-sm transition-colors ${
                  answerChecked
                    ? correctOptionIndexes.includes(i)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : selectedOptionIndex === i
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-slate-100 bg-slate-50 text-slate-700'
                    : selectedOptionIndex === i
                    ? isTopicMode
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-slate-100'
                } ${answerChecked ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className={`w-6 h-6 rounded-md border font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${
                  answerChecked && correctOptionIndexes.includes(i)
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : answerChecked && selectedOptionIndex === i
                    ? 'bg-rose-100 border-rose-300 text-rose-700'
                    : selectedOptionIndex === i
                    ? isTopicMode
                      ? 'bg-rose-100 border-rose-300 text-rose-700'
                      : 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  {OPTION_LABELS[i] ?? String(i + 1)}
                </span>
                <span className="leading-snug">{opt}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action zone */}
        <div className="px-6 pb-6">
          {phase === 'thinking' && (
            <button
              type="button"
              disabled={selectedOptionIndex === null}
              onClick={handleFlip}
              className={`w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none ${
                isTopicMode
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-[0_4px_12px_-2px_rgba(225,29,72,0.4)]'
                  : 'bg-slate-900 hover:bg-slate-800 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.3)]'
              }`}
            >
              Kiểm tra đáp án và đánh giá mức nhớ
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}

          {isRating && (
            <div>
              <div className={`mb-3 rounded-xl border px-3 py-2.5 text-xs ${
                isSelectedAnswerCorrect === null
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : isSelectedAnswerCorrect
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}>
                {isSelectedAnswerCorrect === null ? (
                  <p className="font-semibold">Câu này chưa có đáp án chuẩn để đối chiếu.</p>
                ) : isSelectedAnswerCorrect ? (
                  <p className="font-semibold">Bạn chọn đúng đáp án.</p>
                ) : (
                  <p>
                    <span className="font-semibold">Bạn chọn chưa đúng.</span>{' '}
                    Đáp án đúng: {formatCorrectAnswer(currentQuestion.answer, options)}
                  </p>
                )}
              </div>
              <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Bạn nhớ câu này ở mức nào?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUALITY_LEVELS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    disabled={phase === 'submitting'}
                    onClick={() => void handleRate(q.value)}
                    className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 font-semibold transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${q.cls}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${q.dot}`} />
                    <span className="font-bold leading-tight">{q.label}</span>
                    <span className="text-[10px] font-normal opacity-70 leading-tight text-center">{q.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <p className="text-center text-[11px] text-slate-400 mt-4 leading-relaxed">
        {isTopicMode
          ? 'Đánh giá trung thực — hệ thống sẽ điều chỉnh tần suất ôn tập phù hợp'
          : 'Chọn mức nhớ thật sự — hệ thống tự điều chỉnh khoảng cách ôn phù hợp'}
      </p>
    </PageShell>
  );
}
