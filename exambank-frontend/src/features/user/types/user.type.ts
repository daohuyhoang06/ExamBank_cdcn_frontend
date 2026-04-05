// User-related types and interfaces

// From Comment.tsx
export interface UserComment {
  id: number;
  author: string;
  avatar: string;
  rating: number; // 1-5
  time: string; // e.g., "2 giờ trước"
  content: string;
  likes: number;
  image?: string; // Optional, URL ảnh
}

// From ExamBankPage.tsx
export interface EducationLevel {
  id: string;
  name: string;
  group: string;
}

export type Subject = string;

// From UserHomePage.tsx
import type { ReactNode } from "react";

export interface Recommendation {
  title: string;
  description: string;
  icon: ReactNode; // ✅ chuẩn
  tag: string;
  color: string;
  stats: string;
}

export interface Ranking {
  rank: number;
  name: string;
  score: string;
  avatar: string;
}

// From makeexam/Examreview.tsx
export interface TopicData {
  name: string;
  percentage: number;
  color: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  score: number;
  isUser: boolean;
}

export interface QuestionItemProps {
  status: 'correct' | 'incorrect';
  title: string;
  desc: string;
  time: string;
}

// From submit-exam/Mysubmit.tsx
export interface Submission {
  id: number;
  title: string;
  university: string;
  year: string;
  subject: string;
  type: string; // e.g., "Final Exam"
  status: 'Approved' | 'Pending' | 'Rejected';
  reason?: string; // Optional
  date: string;
}

// From submit-exam/SubmitExamPage.tsx
export interface SelectedFile {
  name: string;
  size: string; // e.g., "1.2 MB"
}


 // Đề thi
 // src/features/exam/types.ts

export type QuestionType = 
  | "multiple_choice" 
  | "true_false" 
  | "fill_blank";

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  score: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple_choice";
  options: string[];
  correctAnswer: number; // index
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: "true_false";
  correctAnswer: boolean;
}

export interface FillBlankQuestion extends BaseQuestion {
  type: "fill_blank";
  correctAnswer: string;
}

export type Question = 
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillBlankQuestion;

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // phút
  questions: Question[];
  createdAt: string;
}