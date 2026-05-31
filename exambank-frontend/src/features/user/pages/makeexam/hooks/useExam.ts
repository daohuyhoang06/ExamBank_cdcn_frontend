import { useEffect, useState } from 'react';
import { examService } from '@/features/user/services/user.service';
import type { Exam, ExamSessionStatusResponse, SaveAnswerItem, SubmitReason } from '@/features/user/types/user.type';
import { getStoredAuthToken } from '@/lib/api-client';

const EXAM_PROGRESS_STORAGE_PREFIX = 'exambank_exam_progress';

type PersistedExamProgress = {
  examId: number;
  sessionId: number;
  expiresAt?: string;
  timeLimitMinutes?: number;
  currentIndex: number;
  userAnswers: Record<number, unknown>;
  lastKnownTimeLeftSeconds?: number;
  savedAt?: string;
};

const getExamProgressStorageKey = (examId: number) => `${EXAM_PROGRESS_STORAGE_PREFIX}:${examId}`;

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const objectError = error as { response?: { status?: unknown }; status?: unknown };
  const responseStatus = objectError.response?.status;
  if (typeof responseStatus === 'number') {
    return responseStatus;
  }

  return typeof objectError.status === 'number' ? objectError.status : undefined;
};

const readPersistedExamProgress = (examId: number): PersistedExamProgress | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getExamProgressStorageKey(examId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedExamProgress;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (parsed.examId !== examId || typeof parsed.sessionId !== 'number' || !Number.isFinite(parsed.sessionId)) {
      return null;
    }

    const safeAnswers: Record<number, unknown> = {};
    const answerSource = toRecord(parsed.userAnswers);
    if (answerSource) {
      for (const [key, value] of Object.entries(answerSource)) {
        const numericKey = Number(key);
        if (!Number.isFinite(numericKey)) {
          continue;
        }
        safeAnswers[numericKey] = value;
      }
    }

    return {
      examId,
      sessionId: parsed.sessionId,
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : undefined,
      timeLimitMinutes: typeof parsed.timeLimitMinutes === 'number' && Number.isFinite(parsed.timeLimitMinutes)
        ? parsed.timeLimitMinutes
        : undefined,
      currentIndex: typeof parsed.currentIndex === 'number' && Number.isFinite(parsed.currentIndex) ? parsed.currentIndex : 0,
      userAnswers: safeAnswers,
      lastKnownTimeLeftSeconds:
        typeof parsed.lastKnownTimeLeftSeconds === 'number' && Number.isFinite(parsed.lastKnownTimeLeftSeconds)
          ? parsed.lastKnownTimeLeftSeconds
          : undefined,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined,
    };
  } catch {
    return null;
  }
};

const clearPersistedExamProgress = (examId: number) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(getExamProgressStorageKey(examId));
  } catch {
    // Ignore storage errors.
  }
};

const getRecoveredRemainingSeconds = (progress: PersistedExamProgress): number | null => {
  if (progress.expiresAt) {
    const expiresAtMs = new Date(progress.expiresAt).getTime();
    if (Number.isFinite(expiresAtMs)) {
      const expiresRemaining = Math.floor((expiresAtMs - Date.now()) / 1000);
      if (expiresRemaining > 0) {
        return expiresRemaining;
      }
    }
  }

  if (typeof progress.lastKnownTimeLeftSeconds !== 'number' || progress.lastKnownTimeLeftSeconds <= 0) {
    return null;
  }

  const savedAtMs = progress.savedAt ? new Date(progress.savedAt).getTime() : Number.NaN;
  if (!Number.isFinite(savedAtMs)) {
    return progress.lastKnownTimeLeftSeconds;
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - savedAtMs) / 1000));
  const remaining = progress.lastKnownTimeLeftSeconds - elapsedSeconds;
  return remaining > 0 ? remaining : null;
};

const resolveSessionClock = (expiresAt: string | undefined, fallbackSeconds: number) => {
  if (!expiresAt) {
    return {
      timeLeft: fallbackSeconds,
      activeExpiresAt: null as string | null,
    };
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return {
      timeLeft: fallbackSeconds,
      activeExpiresAt: null as string | null,
    };
  }

  const secondsLeft = Math.floor((expiresAtMs - Date.now()) / 1000);
  if (secondsLeft <= 0) {
    // Some environments return timezone-shifted expiresAt. Fallback to duration instead of forcing timeout.
    return {
      timeLeft: fallbackSeconds,
      activeExpiresAt: null as string | null,
    };
  }

  return {
    timeLeft: secondsLeft,
    activeExpiresAt: expiresAt,
  };
};

const getStrictRemainingSeconds = (expiresAt: string) => {
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return 0;
  }

  const secondsLeft = Math.floor((expiresAtMs - Date.now()) / 1000);
  return secondsLeft > 0 ? secondsLeft : 0;
};

const buildSaveAnswers = (exam: Exam, answersByIndex: Record<number, unknown>): SaveAnswerItem[] => {
  return Object.entries(answersByIndex)
    .map(([indexKey, value]) => {
      const questionIndex = Number(indexKey);
      const question = exam.questions[questionIndex];
      if (!question || value === undefined || value === null) {
        return null;
      }

      const questionId = Number(question.id);
      if (Number.isNaN(questionId)) {
        return null;
      }

      return {
        questionId,
        answerContent: toAnswerContent(question, value),
      } satisfies SaveAnswerItem;
    })
    .filter((item): item is SaveAnswerItem => item !== null);
};

const toAnswerContent = (question: Exam['questions'][number], rawValue: unknown): string => {
  if (question.type === 'multiple_choice') {
    if (typeof rawValue === 'number') {
      return String.fromCharCode(65 + rawValue);
    }
    return String(rawValue ?? '').trim();
  }

  if (question.type === 'true_false') {
    if (typeof rawValue === 'boolean') {
      return rawValue ? 'Đúng' : 'Sai';
    }
    return String(rawValue ?? '').trim();
  }

  return String(rawValue ?? '').trim();
};

export const useExam = (examId?: string) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [examLoadError, setExamLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, unknown>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [isResumedAttempt, setIsResumedAttempt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredAuthToken()) {
      setIsLoadingExam(false);
      setExam(null);
      setExamLoadError('Vui lòng đăng nhập để làm bài thi online.');
      return;
    }

    if (!examId) {
      setIsLoadingExam(false);
      setExamLoadError('Không tìm thấy mã đề thi.');
      return;
    }

    const fetchData = async () => {
      setIsLoadingExam(true);
      setExamLoadError(null);
      try {
        const data = await examService.getExamById(examId);
        if (!data) {
          setExam(null);
          setExamLoadError('Không tìm thấy đề thi hoặc đề thi chưa được phê duyệt.');
          return;
        }

        setExam(data);
        setSubmitError(null);
        setIsResumedAttempt(false);

        if (data.questions.length === 0) {
          setExamLoadError('Đề thi này chưa có câu hỏi. Vui lòng thử lại sau.');
          return;
        }

        const numericExamId = Number(examId);
        if (Number.isNaN(numericExamId)) {
          setExamLoadError('Mã đề thi không hợp lệ.');
          return;
        }

        const persistedProgress = readPersistedExamProgress(numericExamId);
        const recoveredRemainingSeconds = persistedProgress ? getRecoveredRemainingSeconds(persistedProgress) : null;
        if (persistedProgress && recoveredRemainingSeconds !== null) {
          try {
            const status = await examService.getExamSessionStatus(persistedProgress.sessionId);
            if (status.status !== 'IN_PROGRESS') {
              clearPersistedExamProgress(numericExamId);
            } else {
              const fallbackDurationSeconds = (persistedProgress.timeLimitMinutes ?? data.duration) * 60;
              setSessionId(persistedProgress.sessionId);
              const clock = resolveSessionClock(persistedProgress.expiresAt, fallbackDurationSeconds);
              setTimeLimitMinutes(persistedProgress.timeLimitMinutes ?? data.duration);
              setExpiresAt(clock.activeExpiresAt);
              setTimeLeft(clock.activeExpiresAt ? clock.timeLeft : recoveredRemainingSeconds);
              setCurrentIndex(Math.min(Math.max(0, persistedProgress.currentIndex), Math.max(0, data.questions.length - 1)));
              setUserAnswers(persistedProgress.userAnswers);
              setIsResumedAttempt(true);
              return;
            }
          } catch {
            const fallbackDurationSeconds = (persistedProgress.timeLimitMinutes ?? data.duration) * 60;
            const clock = resolveSessionClock(persistedProgress.expiresAt, fallbackDurationSeconds);
            setSessionId(persistedProgress.sessionId);
            setExpiresAt(clock.activeExpiresAt);
            setTimeLimitMinutes(persistedProgress.timeLimitMinutes ?? data.duration);
            setTimeLeft(clock.activeExpiresAt ? clock.timeLeft : recoveredRemainingSeconds);
            setCurrentIndex(Math.min(Math.max(0, persistedProgress.currentIndex), Math.max(0, data.questions.length - 1)));
            setUserAnswers(persistedProgress.userAnswers);
            setIsResumedAttempt(true);
            return;
          }
        }

        if (persistedProgress && recoveredRemainingSeconds === null) {
          try {
            const status = await examService.getExamSessionStatus(persistedProgress.sessionId);
            if (status.status === 'IN_PROGRESS') {
              const timeoutAnswers = buildSaveAnswers(data, persistedProgress.userAnswers);
              if (timeoutAnswers.length > 0) {
                await examService.saveExamAnswers(persistedProgress.sessionId, timeoutAnswers);
              }
              await examService.submitExamSession(persistedProgress.sessionId, 'TIMEOUT');
            }
          } catch {
            // Ignore timeout submit errors and continue with new session creation.
          }
        }

        clearPersistedExamProgress(numericExamId);
        setTimeLeft(data.duration * 60);
        setSessionId(null);
        setExpiresAt(null);
        setTimeLimitMinutes(data.duration);
        setCurrentIndex(0);
        setUserAnswers({});

        const session = await examService.startExamSession(numericExamId);

        const fallbackDurationSeconds = (session.timeLimitMinutes ?? data.duration) * 60;
        const clock = resolveSessionClock(session.expiresAt, fallbackDurationSeconds);
        setTimeLeft(clock.timeLeft);

        setSessionId(session.sessionId);
        setExpiresAt(clock.activeExpiresAt);
        setTimeLimitMinutes(session.timeLimitMinutes ?? data.duration);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        setSubmitError('Không thể khởi tạo phiên thi. Vui lòng thử lại.');
        setExamLoadError(message || 'Không thể bắt đầu làm đề ngay lúc này.');
      } finally {
        setIsLoadingExam(false);
      }
    };

    void fetchData();
  }, [examId]);

  useEffect(() => {
    if (expiresAt) {
      const timer = setInterval(() => {
        setTimeLeft(getStrictRemainingSeconds(expiresAt));
      }, 1000);
      return () => clearInterval(timer);
    }

    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((previous) => Math.max(0, previous - 1)), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, timeLeft]);

  useEffect(() => {
    if (!exam || sessionId === null) {
      return;
    }

    const numericExamId = Number(exam.id);
    if (Number.isNaN(numericExamId)) {
      return;
    }

    if (timeLeft <= 0) {
      clearPersistedExamProgress(numericExamId);
      return;
    }

    const progress: PersistedExamProgress = {
      examId: numericExamId,
      sessionId,
      expiresAt: expiresAt ?? undefined,
      timeLimitMinutes: timeLimitMinutes ?? undefined,
      currentIndex,
      userAnswers,
      lastKnownTimeLeftSeconds: timeLeft,
      savedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(getExamProgressStorageKey(numericExamId), JSON.stringify(progress));
    } catch {
      // Ignore storage errors.
    }
  }, [currentIndex, exam, expiresAt, sessionId, timeLeft, timeLimitMinutes, userAnswers]);

  const submitExam = async (submitReason: SubmitReason = 'MANUAL'): Promise<ExamSessionStatusResponse | null> => {
    if (!exam || sessionId === null) {
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const answers = buildSaveAnswers(exam, userAnswers);

      if (answers.length > 0) {
        await examService.saveExamAnswers(sessionId, answers);
      }

      const submitted = await examService.submitExamSession(sessionId, submitReason);
      const numericExamId = Number(exam.id);
      if (!Number.isNaN(numericExamId)) {
        clearPersistedExamProgress(numericExamId);
      }

      return submitted;
    } catch (error) {
      if (getHttpStatus(error) === 409 || getHttpStatus(error) === 403) {
        try {
          const latestStatus = await examService.getExamSessionStatus(sessionId);
          if (latestStatus.status !== 'IN_PROGRESS') {
            const numericExamId = Number(exam.id);
            if (!Number.isNaN(numericExamId)) {
              clearPersistedExamProgress(numericExamId);
            }
            return latestStatus;
          }
        } catch {
          // Ignore status recovery errors and keep the original error messaging.
        }
      }

      const message = error instanceof Error ? error.message : 'Không thể nộp bài lúc này.';
      setSubmitError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
};
