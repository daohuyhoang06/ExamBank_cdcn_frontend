import { useEffect, useState } from 'react';
import { examService, userService } from '../../../services/user.service';
import type { TopicData, LeaderboardUser, ExamSessionResult } from '../../../types/user.type';

export const useExamreview = (sessionId?: number) => {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [examResult, setExamResult] = useState<ExamSessionResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const t = await userService.getTopics();
      setTopics(t);

      if (!sessionId) {
        setExamResult(null);
        setResultError(null);
        setLeaderboardError(null);
        const l = await userService.getLeaderboard();
        setLeaderboard(l);
        return;
      }

      setIsLoadingResult(true);
      setResultError(null);
      setLeaderboardError(null);
      let loadedResult: ExamSessionResult | null = null;
      try {
        loadedResult = await examService.getExamSessionResult(sessionId);
        setExamResult(loadedResult);
      } catch {
        setResultError('Chua lay duoc ket qua bai thi. Vui long thu lai sau.');
        setLeaderboard([]);
        return;
      } finally {
        setIsLoadingResult(false);
      }

      try {
        const scopedLeaderboard = await examService.getExamLeaderboard(sessionId);
        if (scopedLeaderboard.length > 0) {
          setLeaderboard(scopedLeaderboard);
          return;
        }
      } catch {
        // Continue with fallback row so the ranking block is never blank for the taker.
      }

      try {
        const profile = await userService.getMyProfile();
        setLeaderboard([
          {
            rank: 1,
            name: profile.name,
            score: Math.round(loadedResult?.totalScore ?? 0),
            isUser: true,
          },
        ]);
      } catch {
        setLeaderboard([]);
      }
      setLeaderboardError('Bang xep hang bai thi chua san sang. Dang hien thi tam diem cua ban.');
    };

    void fetchData();
  }, [sessionId]);

  return { topics, leaderboard, examResult, isLoadingResult, resultError, leaderboardError };
};