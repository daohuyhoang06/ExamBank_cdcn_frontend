import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SubmitReason } from '@/features/user/types/user.type';
import { sanitizeRichHtml } from '@/features/user/utils/rich-text';
import { useExam } from '../hooks/useExam';
import ExamHeader from '../components/exam/ExamHeader';
import ExamSidebar from '../components/exam/ExamSidebar';
import QuestionRenderer from '../components/exam/QuestionRenderer';

const REVIEW_SNAPSHOT_STORAGE_PREFIX = 'exambank_exam_review_snapshot';

const Exampage = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const {
    exam,
    isLoadingExam,
    examLoadError,
    currentIndex,
    setCurrentIndex,
    userAnswers,
    setUserAnswers,
    timeLeft,
    sessionId,
    isResumedAttempt,
    submitExam,
    isSubmitting,
    submitError,
  } = useExam(examId);

  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<number, boolean>>({});
  const allowExitRef = useRef(false);
  const timeoutAutoSubmitRef = useRef(false);
  const shouldWarnOnExit = Boolean(exam && sessionId !== null && timeLeft > 0 && !isSubmitting);

  useEffect(() => {
    allowExitRef.current = false;
    timeoutAutoSubmitRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!shouldWarnOnExit) {
      return;
    }

    const warningMessage = 'Bạn đang làm bài thi. Nếu rời trang, bài làm sẽ được giữ lại nếu quay lại trước khi hết giờ.';
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowExitRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = warningMessage;
      return warningMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldWarnOnExit]);

  useEffect(() => {
    if (!shouldWarnOnExit) {
      return;
    }

    const warningMessage = 'Bạn đang làm bài thi. Bạn có chắc muốn quay lại không?';
    const handlePopState = () => {
      if (allowExitRef.current) {
        return;
      }

      const shouldLeave = window.confirm(warningMessage);
      if (shouldLeave) {
        allowExitRef.current = true;
        navigate(-1);
        return;
      }

      window.history.pushState({ examBackGuard: true }, '', window.location.href);
    };

    window.history.pushState({ examBackGuard: true }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, shouldWarnOnExit]);

  const handleSubmit = useCallback(async (reason: SubmitReason = 'MANUAL') => {
    if (!exam || isSubmitting) {
      return;
    }

    const status = await submitExam(reason);
    if (!status) {
      return;
    }

    const reviewSnapshot = {
      examId: exam.id,
      examTitle: exam.title,
      questionCount: exam.questions.length,
      totalScore: status.totalScore ?? 0,
      submittedAt: status.submittedAt,
      questions: exam.questions,
      userAnswers,
    };

    try {
      sessionStorage.setItem(
        `${REVIEW_SNAPSHOT_STORAGE_PREFIX}:${status.sessionId}`,
        JSON.stringify(reviewSnapshot),
      );
    } catch {
      // Ignore storage errors and continue navigating with route state.
    }

    allowExitRef.current = true;
    navigate(`/user/exambank/examreview?sessionId=${status.sessionId}&examId=${exam.id}`, {
      replace: true,
      state: {
        ...reviewSnapshot,
      },
    });
  }, [exam, isSubmitting, navigate, submitExam, userAnswers]);

  useEffect(() => {
    if (!exam || sessionId === null || isSubmitting || timeLeft > 0 || timeoutAutoSubmitRef.current) {
      return;
    }

    timeoutAutoSubmitRef.current = true;
    void handleSubmit('TIMEOUT');
  }, [exam, handleSubmit, isSubmitting, sessionId, timeLeft]);

  const toggleBookmark = () => {
    setBookmarkedQuestions((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const questionHtmlSource = exam?.questions[currentIndex]?.question ?? '';
  const sanitizedQuestionHtml = useMemo(
    () => sanitizeRichHtml(questionHtmlSource),
    [questionHtmlSource],
  );

  if (isLoadingExam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] font-bold text-slate-400 animate-pulse">
        Đang tải đề thi...
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] px-4">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-base font-bold text-amber-800">Không thể mở đề thi</p>
          <p className="mt-2 text-sm text-amber-700">
            {examLoadError ?? 'Hiện chưa thể tải đề này. Vui lòng thử lại sau.'}
          </p>
        </div>
      </div>
    );
  }

  if (exam.questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] px-4">
        <div className="max-w-lg rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-base font-bold text-blue-900">Đề thi chưa sẵn sàng</p>
          <p className="mt-2 text-sm text-blue-700">
            Đề này đã được đăng nhưng chưa có câu hỏi, nên bạn chưa thể làm ngay lúc này.
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentIndex];
  const isBookmarked = Boolean(bookmarkedQuestions[currentIndex]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-6 pb-12 pt-6">
        <section className="rounded-[1.25rem] border border-slate-200/70 bg-white px-5 py-4 shadow-sm md:px-6 md:py-5">
          <ExamHeader
            exam={exam}
            timeLeft={timeLeft}
            isSubmitting={isSubmitting}
            onSubmit={() => void handleSubmit('MANUAL')}
          />
        </section>

        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex-1 space-y-6">
            {isResumedAttempt ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                Đã khôi phục bài làm trước đó của bạn vì phiên thi vẫn còn thời gian.
              </div>
            ) : null}

            {timeLeft === 0 && !isSubmitting ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Đã hết thời gian làm bài. Hệ thống đang tự nộp bài của bạn.
              </div>
            ) : null}

            {submitError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="rounded-[1.25rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex items-start justify-between">
                <span className="rounded bg-[#d5e3ff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#144780]">
                  Câu hỏi {currentIndex + 1}
                </span>

                <button onClick={toggleBookmark} className="text-slate-400 transition-colors hover:text-[#003466]">
                  <Bookmark
                    size={20}
                    className={isBookmarked ? 'fill-[#003466] text-[#003466]' : ''}
                  />
                </button>
              </div>

              <div className="space-y-6">
                <div
                  className="text-lg leading-relaxed text-[#191c1e] [&_img]:my-2 [&_img]:mx-auto [&_img]:block [&_img]:h-auto [&_img]:max-w-[min(100%,200px)] [&_img]:rounded-lg [&_figure.image]:my-2 [&_figure.image]:mx-auto [&_figure.image]:max-w-[min(100%,200px)]"
                  dangerouslySetInnerHTML={{ __html: sanitizedQuestionHtml }}
                />

                <QuestionRenderer
                  question={currentQuestion}
                  index={currentIndex}
                  userAnswers={userAnswers}
                  setUserAnswers={setUserAnswers}
                />
              </div>

              <div className="mt-8 flex items-center justify-between px-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 font-bold text-[#003466] transition-colors hover:bg-[#d5e3ff] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                  Câu trước
                </button>

                <div className="flex gap-4">
                  <button
                    disabled={currentIndex === exam.questions.length - 1}
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                    className="rounded-md bg-[#003466] px-8 py-2 font-bold text-white transition-all hover:bg-[#1a4b84] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="inline-flex items-center gap-1">
                      Câu tiếp theo <ChevronRight size={16} />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <ExamSidebar
            exam={exam}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            userAnswers={userAnswers}
          />
        </div>
      </main>

    </div>
  );
};

export default Exampage;