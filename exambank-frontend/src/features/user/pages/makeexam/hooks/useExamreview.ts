import { useEffect, useState } from 'react';
import { examService, userService } from '../../../services/user.service';
import type { LeaderboardUser, ExamSessionResult } from '../../../types/user.type';

const RESULT_POLL_INTERVAL_MS = 5000;

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

export const useExamreview = (sessionId?: number) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [examResult, setExamResult] = useState<ExamSessionResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let pollTimer: number | undefined;

    const fetchData = async () => {
      if (!sessionId) {
        setExamResult(null);
        setResultError(null);
        setLeaderboardError(null);
        const l = await userService.getLeaderboard();
        if (!isActive) {
          return;
        }
        setLeaderboard(l);
        return;
      }

      setIsLoadingResult(true);
      setResultError(null);
      setLeaderboardError(null);
      const loadCompletedResult = async () => {
        if (!isActive) {
          return;
        }

        try {
          const status = await examService.getExamSessionStatus(sessionId);
          if (!isActive) {
            return;
          }

          if (status.status === 'ABANDONED') {
            setResultError('Bai thi da bi huy, vui long thu lai.');
            setLeaderboard([]);
            setIsLoadingResult(false);
            return;
          }

          if (status.status !== 'COMPLETED') {
            pollTimer = window.setTimeout(() => {
              void loadCompletedResult();
            }, RESULT_POLL_INTERVAL_MS);
            return;
          }

          const loadedResult = await examService.getExamSessionResult(sessionId);
          if (!isActive) {
            return;
          }

          setExamResult(loadedResult);

          try {
            const scopedLeaderboard = await examService.getExamLeaderboard(sessionId);
            if (!isActive) {
              return;
            }

            if (scopedLeaderboard.length > 0) {
              setLeaderboard(scopedLeaderboard);
            } else {
              const profile = await userService.getMyProfile();
              if (!isActive) {
                return;
              }

              setLeaderboard([
                {
                  rank: 1,
                  name: profile.name,
                  score: Math.round(loadedResult.totalScore ?? status.totalScore ?? 0),
                  isUser: true,
                },
              ]);
              setLeaderboardError('Bảng xếp hạng bài thi chưa sẵn sàng. Đang hiển thị tạm điểm của bạn.');
            }
          } catch {
            try {
              const profile = await userService.getMyProfile();
              if (!isActive) {
                return;
              }

              setLeaderboard([
                {
                  rank: 1,
                  name: profile.name,
                  score: Math.round(loadedResult.totalScore ?? status.totalScore ?? 0),
                  isUser: true,
                },
              ]);
              setLeaderboardError('Bảng xếp hạng bài thi chưa sẵn sàng. Đang hiển thị tạm điểm của bạn.');
            } catch {
              if (!isActive) {
                return;
              }

              setLeaderboard([]);
              setLeaderboardError('Bảng xếp hạng bài thi chưa sẵn sàng. Đang hiển thị tạm điểm của bạn.');
            }
          } finally {
            if (isActive) {
              setIsLoadingResult(false);
            }
          }
        } catch (error) {
          if (getHttpStatus(error) === 403) {
            if (!isActive) {
              return;
            }

            setResultError('Phiên thi không còn khả dụng hoặc bạn không còn quyền truy cập.');
            setIsLoadingResult(false);
            return;
          }

          if (!isActive) {
            return;
          }

          setResultError('Chưa lấy được trạng thái chấm điểm. Vui lòng thử lại sau.');
          setIsLoadingResult(false);
        }
      };

      void loadCompletedResult();
    };

    void fetchData();
    return () => {
      isActive = false;
      if (pollTimer !== undefined) {
        window.clearTimeout(pollTimer);
      }
    };
  }, [sessionId]);

  return { leaderboard, examResult, isLoadingResult, resultError, leaderboardError };
};
