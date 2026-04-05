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
  mockExam,
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
  Exam,
} from '../types/user.type';

// ================= USER SERVICE =================
export const userService = {
  getComments: async (): Promise<UserComment[]> => {
    return mockComments;
  },

  getEducationLevels: async (): Promise<EducationLevel[]> => {
    return mockEducationLevels;
  },

  getSubjects: async (): Promise<Subject[]> => {
    return mockSubjects;
  },

  getRecommendations: async (): Promise<Recommendation[]> => {
    return mockRecommendations;
  },

  getRankings: async (): Promise<Ranking[]> => {
    return mockRankings;
  },

  getTopics: async (): Promise<TopicData[]> => {
    return mockTopics;
  },

  getLeaderboard: async (): Promise<LeaderboardUser[]> => {
    return mockLeaderboard;
  },

  getSubmissions: async (): Promise<Submission[]> => {
    return mockSubmissions;
  },

  getSelectedFile: async (): Promise<SelectedFile> => {
    return mockSelectedFile;
  },
};

// ================= EXAM SERVICE =================
export const examService = {
  getExamById: async (id: string): Promise<Exam | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (id === mockExam.id) {
          resolve(mockExam);
        } else {
          resolve(null);
        }
      }, 500);
    });
  },

  getAllExams: async (): Promise<Exam[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([mockExam]);
      }, 500);
    });
  }
};