import { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { CheckCircle2, RotateCcw, Trophy } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Exam, Question, QuestionResult } from '@/features/user/types/user.type';
import { examService, userService } from '@/features/user/services/user.service';
import { sanitizeRichHtml } from '@/features/user/utils/rich-text';
import { useExamreview } from '../hooks/useExamreview';

type ExamReviewRouteState = {
  examId?: string;
  examTitle?: string;
  questionCount?: number;
  totalScore?: number;
  submittedAt?: string;
  questions?: Exam['questions'];
  userAnswers?: Record<number, unknown>;
};

type ReviewQuestionRow = {
  order: number;
  result: QuestionResult;
  question?: Question;
  userAnswer?: unknown;
};

const REVIEW_SNAPSHOT_STORAGE_PREFIX = 'exambank_exam_review_snapshot';
const SM2_SYNC_STORAGE_PREFIX = 'exambank_sm2_sync';

const readStoredReviewSnapshot = (sessionId?: number): ExamReviewRouteState | null => {
  if (!sessionId) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${REVIEW_SNAPSHOT_STORAGE_PREFIX}:${sessionId}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ExamReviewRouteState;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const formatDateTime = (isoDate?: string): string => {
  if (!isoDate) {
    return 'Chưa cập nhật';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatScore = (score: number): string => {
  if (!Number.isFinite(score)) {
    return '0';
  }

  return Number.isInteger(score) ? String(score) : score.toFixed(1);
};

const toOptionLabel = (index: number): string => String.fromCharCode(65 + index);

const toAnswerText = (question: Question, rawValue: unknown): string => {
  if (rawValue === undefined || rawValue === null) {
    return 'Chưa trả lời';
  }

  if (question.type === 'multiple_choice') {
    const selectedIndex = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < question.options.length) {
      return `${toOptionLabel(selectedIndex)}. ${question.options[selectedIndex]}`;
    }
    return String(rawValue);
  }

  if (question.type === 'true_false') {
    return rawValue === true ? 'Đúng' : rawValue === false ? 'Sai' : String(rawValue);
  }

  return String(rawValue);
};

const toSm2Quality = (result: QuestionResult): number | null => {
  if (result.isCorrect === true) {
    return 4;
  }
  if (result.isCorrect === false) {
    return 1;
  }
  return null;
};

const renderQuestionAnswers = (
  row: ReviewQuestionRow,
  hasJudgement: boolean,
  isCorrectQuestion: boolean,
) => {
  const question = row.question;
  if (!question) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Không có dữ liệu chi tiết đáp án cho câu này.
      </div>
    );
  }

  if (question.type === 'multiple_choice') {
    const selectedIndex = typeof row.userAnswer === 'number' ? row.userAnswer : Number.NaN;

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {question.options.map((option, index) => {
          const isCorrectOption = index === question.correctAnswer;
          const isSelectedOption = Number.isInteger(selectedIndex) && selectedIndex === index;

          let optionClass = 'border border-slate-100 text-slate-500 bg-white';
          if (isCorrectOption) {
            optionClass = 'border-2 border-green-500 bg-green-50 text-green-700';
          } else if (isSelectedOption && !isCorrectQuestion) {
            optionClass = hasJudgement
              ? 'border-2 border-red-500 bg-red-50 text-red-700'
              : 'border-2 border-blue-500 bg-blue-50 text-blue-700';
          } else if (isSelectedOption) {
            optionClass = 'border-2 border-blue-500 bg-blue-50 text-blue-700';
          }

          return (
            <div key={`${row.order}-${index}`} className={`rounded-xl p-4 ${optionClass}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {toOptionLabel(index)}. {option}
                  {isSelectedOption ? ' (Bạn chọn)' : ''}
                  {isCorrectOption ? ' (Đáp án đúng)' : ''}
                </span>
                {isCorrectOption ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === 'true_false') {
    const selectedValue = typeof row.userAnswer === 'boolean' ? row.userAnswer : undefined;

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[true, false].map((optionValue, index) => {
          const label = optionValue ? 'Đúng' : 'Sai';
          const isCorrectOption = optionValue === question.correctAnswer;
          const isSelectedOption = selectedValue === optionValue;

          let optionClass = 'border border-slate-100 text-slate-500 bg-white';
          if (isCorrectOption) {
            optionClass = 'border-2 border-green-500 bg-green-50 text-green-700';
          } else if (isSelectedOption && !isCorrectQuestion) {
            optionClass = hasJudgement
              ? 'border-2 border-red-500 bg-red-50 text-red-700'
              : 'border-2 border-blue-500 bg-blue-50 text-blue-700';
          } else if (isSelectedOption) {
            optionClass = 'border-2 border-blue-500 bg-blue-50 text-blue-700';
          }

          return (
            <div key={`${row.order}-tf-${index}`} className={`rounded-xl p-4 ${optionClass}`}>
              <span className="text-sm font-semibold">
                {label}
                {isSelectedOption ? ' (Bạn chọn)' : ''}
                {isCorrectOption ? ' (Đáp án đúng)' : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const userAnswerText = toAnswerText(question, row.userAnswer);
  const correctAnswerText = String(question.correctAnswer ?? '');

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div
        className={`rounded-xl border-2 p-4 text-sm ${
          hasJudgement && !isCorrectQuestion ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-500 bg-blue-50 text-blue-700'
        }`}
      >
        Bạn chọn: {userAnswerText}
      </div>
      <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4 text-sm font-semibold text-green-700">
        Đáp án đúng: {correctAnswerText}
      </div>
    </div>
  );
};

const Examreview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const routeState = (location.state as ExamReviewRouteState | null) ?? null;

  const sessionIdParam = searchParams.get('sessionId');
  const examIdParam = searchParams.get('examId') ?? undefined;
  const parsedSessionId = sessionIdParam ? Number(sessionIdParam) : Number.NaN;
  const sessionId = Number.isNaN(parsedSessionId) ? undefined : parsedSessionId;

  const [storedRouteState, setStoredRouteState] = useState<ExamReviewRouteState | null>(null);
  const [fetchedQuestions, setFetchedQuestions] = useState<Exam['questions']>([]);
  const [fetchedExamTitle, setFetchedExamTitle] = useState<string | undefined>();
  const [questionScoreById, setQuestionScoreById] = useState<Record<number, number>>({});
  const attemptedQuestionScoreIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    setStoredRouteState(readStoredReviewSnapshot(sessionId));
  }, [sessionId]);

  useEffect(() => {
    setQuestionScoreById({});
    attemptedQuestionScoreIds.current.clear();
  }, [sessionId]);

  const fallbackExamId = routeState?.examId ?? storedRouteState?.examId ?? examIdParam;

  const localSnapshotQuestions =
    routeState?.questions && routeState.questions.length > 0
      ? routeState.questions
      : storedRouteState?.questions && storedRouteState.questions.length > 0
        ? storedRouteState.questions
        : [];

  useEffect(() => {
    let isActive = true;

    const loadExamForReview = async () => {
      if (localSnapshotQuestions.length > 0 || !fallbackExamId) {
        return;
      }

      const exam = await examService.getExamById(fallbackExamId);
      if (!isActive || !exam) {
        return;
      }

      setFetchedQuestions(exam.questions);
      setFetchedExamTitle(exam.title);
    };

    void loadExamForReview();

    return () => {
      isActive = false;
    };
  }, [localSnapshotQuestions.length, fallbackExamId]);

  const { topics, leaderboard, examResult, isLoadingResult, resultError, leaderboardError } = useExamreview(sessionId);

  const snapshotQuestions = localSnapshotQuestions.length > 0 ? localSnapshotQuestions : fetchedQuestions;
  const snapshotAnswers = routeState?.userAnswers ?? storedRouteState?.userAnswers ?? {};

  const questionResults = examResult?.questionResults ?? [];
  const reviewRows: ReviewQuestionRow[] = useMemo(() => {
    if (questionResults.length === 0) {
      return snapshotQuestions.map((question, index) => ({
        order: index + 1,
        result: {
          questionId: Number(question.id),
          isCorrect: undefined,
          scoreEarned: 0,
        },
        question,
        userAnswer: snapshotAnswers[index],
      }));
    }

    return questionResults.map((result, index) => {
      const matchedQuestionIndex = snapshotQuestions.findIndex((question) => Number(question.id) === result.questionId);
      const resolvedQuestionIndex = matchedQuestionIndex >= 0 ? matchedQuestionIndex : index;

      return {
        order: index + 1,
        result,
        question: snapshotQuestions[resolvedQuestionIndex],
        userAnswer: snapshotAnswers[resolvedQuestionIndex],
      };
    });
  }, [questionResults, snapshotQuestions, snapshotAnswers]);

  useEffect(() => {
    let isActive = true;

    const questionIdsToFetch = Array.from(
      new Set(
        reviewRows
          .map((row) => row.result.questionId)
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ).filter((id) => questionScoreById[id] === undefined && !attemptedQuestionScoreIds.current.has(id));

    if (questionIdsToFetch.length === 0) {
      return;
    }

    questionIdsToFetch.forEach((id) => attemptedQuestionScoreIds.current.add(id));

    const loadQuestionScores = async () => {
      const scoreResults = await Promise.allSettled(
        questionIdsToFetch.map((questionId) => examService.getQuestionScoreById(questionId)),
      );

      if (!isActive) {
        return;
      }

      setQuestionScoreById((prev) => {
        const next = { ...prev };
        let hasChanged = false;

        scoreResults.forEach((result, index) => {
          if (result.status !== 'fulfilled') {
            return;
          }

          const score = result.value;
          if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) {
            return;
          }

          const questionId = questionIdsToFetch[index];
          if (next[questionId] === score) {
            return;
          }

          next[questionId] = score;
          hasChanged = true;
        });

        return hasChanged ? next : prev;
      });
    };

    void loadQuestionScores();

    return () => {
      isActive = false;
    };
  }, [reviewRows, questionScoreById]);

  useEffect(() => {
    if (!sessionId || questionResults.length === 0) {
      return;
    }

    const syncKey = `${SM2_SYNC_STORAGE_PREFIX}:${sessionId}`;
    if (sessionStorage.getItem(syncKey) === 'done') {
      return;
    }

    const sm2Targets = questionResults
      .map((result) => ({
        questionId: result.questionId,
        quality: toSm2Quality(result),
      }))
      .filter((item) => typeof item.quality === 'number' && Number.isFinite(item.questionId));

    if (sm2Targets.length === 0) {
      sessionStorage.setItem(syncKey, 'done');
      return;
    }

    const pushResults = async () => {
      await Promise.allSettled(
        sm2Targets.map((item) =>
          userService.recordSm2ReviewResult(item.questionId, item.quality as number),
        ),
      );
      sessionStorage.setItem(syncKey, 'done');
    };

    void pushResults();
  }, [questionResults, sessionId]);

  const effectiveExamTitle = routeState?.examTitle ?? storedRouteState?.examTitle ?? fetchedExamTitle;
  const effectiveQuestionCount = routeState?.questionCount ?? storedRouteState?.questionCount ?? snapshotQuestions.length;
  const effectiveTotalScore = routeState?.totalScore ?? storedRouteState?.totalScore ?? 0;
  const effectiveSubmittedAt = routeState?.submittedAt ?? storedRouteState?.submittedAt;

  const totalQuestions = reviewRows.length > 0 ? reviewRows.length : effectiveQuestionCount;
  const correctAnswers = questionResults.filter((item) => item.isCorrect === true).length;
  const totalScore = Number(examResult?.totalScore ?? effectiveTotalScore ?? 0);
  const submittedAt = examResult?.submittedAt ?? effectiveSubmittedAt;

  const handleRetry = () => {
    if (fallbackExamId) {
      navigate(`/user/exam/${fallbackExamId}`);
      return;
    }
    navigate('/user/exambank');
  };

  const handleExit = () => {
    navigate('/user/online-exam', { replace: true });
  };

  useEffect(() => {
    const handlePopState = () => {
      navigate('/user/online-exam', { replace: true });
    };

    window.history.pushState({ examReviewBackGuard: true }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans">
      <main className="mx-auto flex w-full max-w-[1400px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
        <div className="flex min-h-[calc(100vh-2rem)] w-full flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-6 text-white md:p-8">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                Kết quả: {effectiveExamTitle ?? 'Bài thi online'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">Hoàn thành lúc: {formatDateTime(submittedAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExit}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-6 py-2 text-sm font-bold transition-all hover:bg-slate-600"
              >
                Thoát
              </button>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold transition-all hover:bg-blue-700"
              >
                <RotateCcw className="h-4 w-4" />
                Làm lại bài
              </button>
            </div>
          </header>

          {(isLoadingResult || resultError) && (
            <div className="border-b border-slate-200 px-6 py-3 md:px-8">
              {isLoadingResult ? (
                <p className="text-sm text-slate-500">Hệ thống đang tải kết quả bài thi...</p>
              ) : null}
              {resultError ? (
                <p className="text-sm text-amber-700">{resultError}</p>
              ) : null}
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            <section className="flex-[3] space-y-6 overflow-y-auto bg-slate-50/50 p-6 md:p-8" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-8">Chi tiết bài làm</h2>

              {reviewRows.map((row) => {
                const hasJudgement = typeof row.result.isCorrect === 'boolean';
                const isCorrectQuestion = row.result.isCorrect === true;
                const scoreFromQuestionApi = questionScoreById[row.result.questionId];
                const questionScore = Number(scoreFromQuestionApi ?? row.question?.score);
                const earnedScore =
                  typeof row.result.scoreEarned === 'number' && Number.isFinite(row.result.scoreEarned)
                    ? row.result.scoreEarned
                    : isCorrectQuestion
                      ? Number.isFinite(questionScore) && questionScore > 0
                        ? questionScore
                        : Number(row.result.maxScore ?? 1)
                      : 0;
                const resolvedMaxScore = Number(row.result.maxScore);
                const maxScoreFromResult = Number.isFinite(resolvedMaxScore) && resolvedMaxScore > 0 ? resolvedMaxScore : 1;
                const validQuestionScore = Number.isFinite(questionScore) && questionScore > 0 ? questionScore : 0;
                const baseMaxScore = Math.max(validQuestionScore, maxScoreFromResult, 1);
                const maxScore = earnedScore > baseMaxScore ? earnedScore : baseMaxScore;

                return (
                  <article
                    key={`${row.result.questionId}-${row.order}`}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          isCorrectQuestion
                            ? 'bg-green-100 text-green-700'
                            : hasJudgement
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        CÂU {row.order}: {isCorrectQuestion ? 'CHÍNH XÁC' : hasJudgement ? 'SAI RỒI' : 'CHƯA CHẤM'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Điểm: {formatScore(earnedScore)}/{formatScore(maxScore)}
                      </span>
                    </div>

                    <div
                      className="mb-4 font-medium text-slate-800 [&_img]:my-2 [&_img]:mx-auto [&_img]:block [&_img]:h-auto [&_img]:max-w-[min(100%,200px)] [&_img]:rounded-lg [&_figure.image]:my-2 [&_figure.image]:mx-auto [&_figure.image]:max-w-[min(100%,200px)]"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichHtml(row.question?.question ?? `Câu hỏi #${row.result.questionId}`),
                      }}
                    />

                    {renderQuestionAnswers(row, hasJudgement, isCorrectQuestion)}
                  </article>
                );
              })}

              {reviewRows.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Chưa có dữ liệu chi tiết bài làm để hiển thị.
                </div>
              )}
            </section>

            <aside className="w-full space-y-8 border-l border-slate-100 bg-white p-6 md:p-8 lg:w-[360px] sticky top-0 h-fit">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-blue-900">Điểm số</p>
                <div className="my-2 text-5xl font-black text-blue-900 drop-shadow-sm">{formatScore(totalScore)}</div>
                <div className="flex justify-center gap-4 mt-4 mb-2">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-green-600">{correctAnswers}</span>
                    <span className="text-xs text-slate-500">Đúng</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-red-500">{totalQuestions - correctAnswers}</span>
                    <span className="text-xs text-slate-500">Sai</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-blue-700">{totalQuestions}</span>
                    <span className="text-xs text-slate-500">Tổng</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {/* Nếu có thời lượng làm bài, hiển thị số phút */}
                  {examResult?.durationMinutes && (
                    <>
                      <span className="font-semibold">Thời gian làm:</span> {examResult.durationMinutes} phút
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Bảng xếp hạng
                </h3>

                {leaderboardError ? (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {leaderboardError}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {leaderboard.map((item) => {
                    const cardClass = item.rank === 1
                      ? 'border-yellow-100 bg-yellow-50 text-yellow-700'
                      : item.isUser
                        ? 'border-blue-100 bg-blue-50 text-blue-700'
                        : 'border-slate-100 bg-slate-50 text-slate-700';

                    return (
                      <div
                        key={`${item.rank}-${item.name}`}
                        className={`flex items-center justify-between rounded-xl border p-3 shadow-md hover:shadow-lg transition-shadow duration-200 ${cardClass}`}
                      >
                        <span className="text-sm font-bold">
                          {item.rank}. {item.isUser ? 'Bạn' : item.name}
                        </span>
                        <span className="font-bold">{formatScore(item.score)}</span>
                      </div>
                    );
                  })}

                  {leaderboard.length === 0 && (
                    <p className="text-sm text-slate-400">Chưa có dữ liệu xếp hạng.</p>
                  )}
                </div>
              </div>

              {topics.length > 0 && (
                <div>
                  <h3 className="mb-3 font-bold text-slate-800">Chủ đề cần ôn thêm</h3>
                  <div className="flex flex-wrap gap-2">
                    {topics.slice(0, 8).map((topic) => (
                      <span
                        key={topic.name}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {topic.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Examreview;
