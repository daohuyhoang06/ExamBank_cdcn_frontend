import { useEffect, useState } from 'react';
import { examService } from '@/features/user/services/user.service';
import type { Exam, ExamSessionStatusResponse, SaveAnswerItem, SubmitReason } from '@/features/user/types/user.type';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) {
      setIsLoadingExam(false);
      setExamLoadError('Khong tim thay ma de thi.');
      return;
    }

    const fetchData = async () => {
      setIsLoadingExam(true);
      setExamLoadError(null);
      try {
        const data = await examService.getExamById(examId);
        if (!data) {
          setExam(null);
          setExamLoadError('Khong tim thay de thi hoac de thi chua duoc phe duyet.');
          return;
        }

        setExam(data);
        setTimeLeft(data.duration * 60);
        setSessionId(null);
        setCurrentIndex(0);
        setUserAnswers({});
        setSubmitError(null);

        if (data.questions.length === 0) {
          setExamLoadError('De thi nay chua co cau hoi. Vui long thu lai sau.');
          return;
        }

        const numericExamId = Number(examId);
        if (Number.isNaN(numericExamId)) {
          setExamLoadError('Ma de thi khong hop le.');
          return;
        }

        const session = await examService.startExamSession(numericExamId);

        const fallbackDurationSeconds = (session.timeLimitMinutes ?? data.duration) * 60;
        if (session.expiresAt) {
          const expiresAtMs = new Date(session.expiresAt).getTime();
          const secondsLeft = Math.floor((expiresAtMs - Date.now()) / 1000);

          // Use fallback duration when timezone/serialization differences make remaining time invalid.
          if (!Number.isFinite(secondsLeft) || secondsLeft <= 0) {
            setTimeLeft(fallbackDurationSeconds);
          } else {
            setTimeLeft(secondsLeft);
          }
        } else {
          setTimeLeft(fallbackDurationSeconds);
        }

        setSessionId(session.sessionId);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        setSubmitError('Khong the khoi tao phien thi. Vui long thu lai.');
        setExamLoadError(message || 'Khong the bat dau lam de ngay luc nay.');
      } finally {
        setIsLoadingExam(false);
      }
    };

    void fetchData();
  }, [examId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((previous) => Math.max(0, previous - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const submitExam = async (submitReason: SubmitReason = 'MANUAL'): Promise<ExamSessionStatusResponse | null> => {
    if (!exam || sessionId === null) {
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const answers: SaveAnswerItem[] = Object.entries(userAnswers)
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

      if (answers.length > 0) {
        await examService.saveExamAnswers(sessionId, answers);
      }

      return await examService.submitExamSession(sessionId, submitReason);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Khong the nop bai luc nay.';
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
    submitExam,
    isSubmitting,
    submitError,
  };
};