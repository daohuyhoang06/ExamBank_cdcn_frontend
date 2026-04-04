import {
  mockComments,
  mockEducationLevels,
  mockSubjects,
  mockRecommendations,
  mockRankings,
  mockTopics,
  mockLeaderboard,
  mockSubmissions,
  mockSelectedFile,
} from '../mocks/user.mock';

import type {
  UserComment,
  EducationLevel,
  Subject,
  Recommendation,
  Ranking,
  TopicData,
  LeaderboardUser,
  Submission,
  SelectedFile,
} from '../types/user.type';

// User service functions to return mock data
export const userService = {
  // For Comment.tsx
  getComments: async (): Promise<UserComment[]> => {
    return mockComments;
  },

  // For ExamBankPage.tsx
  getEducationLevels: async (): Promise<EducationLevel[]> => {
    return mockEducationLevels;
  },

  getSubjects: async (): Promise<Subject[]> => {
    return mockSubjects;
  },

  // For UserHomePage.tsx
  getRecommendations: async (): Promise<Recommendation[]> => {
    return mockRecommendations;
  },

  getRankings: async (): Promise<Ranking[]> => {
    return mockRankings;
  },

  // For makeexam/Examreview.tsx
  getTopics: async (): Promise<TopicData[]> => {
    return mockTopics;
  },

  getLeaderboard: async (): Promise<LeaderboardUser[]> => {
    return mockLeaderboard;
  },

  // For submit-exam/Mysubmit.tsx
  getSubmissions: async (): Promise<Submission[]> => {
    return mockSubmissions;
  },

  // For submit-exam/SubmitExamPage.tsx
  getSelectedFile: async (): Promise<SelectedFile> => {
    return mockSelectedFile;
  },
};