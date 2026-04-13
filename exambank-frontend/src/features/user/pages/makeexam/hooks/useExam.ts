import { useEffect, useState } from 'react';
import { examService } from '@/features/user/services/user.service';
import type { Exam } from '@/features/user/types/user.type';

export const useExam = (examId?: string) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, unknown>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!examId) return;
    const fetchData = async () => {
      const data = await examService.getExamById(examId);
      if (data && data.questions.length > 0) {
        setExam(data);
        setTimeLeft(data.duration * 60);
        setCurrentIndex(0);
        setUserAnswers({});
      }
    };
    fetchData();
  }, [examId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  return {
    exam,
    currentIndex,
    setCurrentIndex,
    userAnswers,
    setUserAnswers,
    timeLeft
  };
};