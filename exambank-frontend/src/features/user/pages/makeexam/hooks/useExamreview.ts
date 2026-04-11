import { useEffect, useState } from 'react';
import { userService } from '../../../services/user.service';
import type { TopicData, LeaderboardUser } from '../../../types/user.type';

export const useExamreview = () => {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const t = await userService.getTopics();
      const l = await userService.getLeaderboard();
      setTopics(t);
      setLeaderboard(l);
    };
    fetchData();
  }, []);

  return { topics, leaderboard };
};