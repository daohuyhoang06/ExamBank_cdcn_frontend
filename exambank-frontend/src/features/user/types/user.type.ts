import type { ReactNode } from "react";

export interface UserComment {
  id: number;
  author: string;
  avatar: string;
  rating: number;
  time: string;
  content: string;
  likes: number;
  image?: string;
  canDelete?: boolean;
}

export type Comment = UserComment;

export interface EducationLevel {
  id: string;
  name: string;
  group: string;
}

export type Subject = string;

export interface Recommendation {
  title: string;
  description: string;
  icon?: ReactNode;
  tag: string;
  color: "error" | "primary" | "secondary";
  stats: string;
  documentId?: number;
}

export interface Ranking {
  rank: number;
  name: string;
  score: string;
  avatar: string;
}

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
  status: "correct" | "incorrect";
  title: string;
  desc: string;
  time: string;
}

export interface Submission {
  id: number;
  title: string;
  university: string;
  year: string;
  subject: string;
  type: string;
  status: "Approved" | "Pending" | "Rejected";
  submittedAt?: string;
  note?: string;
  reason?: string;
  date: string;
}

export interface SelectedFile {
  name: string;
  size: string;
}

export type QuestionType = "multiple_choice" | "true_false" | "fill_blank";

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  score: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple_choice";
  options: string[];
  correctAnswer: number;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: "true_false";
  correctAnswer: boolean;
}

export interface FillBlankQuestion extends BaseQuestion {
  type: "fill_blank";
  correctAnswer: string;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FillBlankQuestion;

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
  createdAt: string;
}

export interface ExamListItem {
  id: number;
  title: string;
  subjectId?: number | null;
  subjectName?: string;
  className?: string;
  educationLevelName?: string;
  durationMinutes?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: string;
  createdAt?: string;
}

export type SubmitReason = "MANUAL" | "TIMEOUT" | "AUTO";

export type ExamSessionStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADING" | "COMPLETED" | "ABANDONED";

export interface StartExamSessionResponse {
  sessionId: number;
  status: ExamSessionStatus;
  startTime?: string;
  timeLimitMinutes?: number;
  expiresAt?: string;
}

export interface SaveAnswerItem {
  questionId: number;
  answerContent: string;
  timeSpentSeconds?: number;
}

export interface ExamSessionStatusResponse {
  sessionId: number;
  status: ExamSessionStatus;
  submittedAt?: string;
  totalScore?: number;
}

export interface QuestionResult {
  questionId: number;
  isCorrect?: boolean;
  scoreEarned?: number;
  maxScore?: number;
}

export interface ExamSessionResult {
  sessionId: number;
  totalScore?: number;
  submitReason?: SubmitReason;
  startTime?: string;
  submittedAt?: string;
  timeLimitMinutes?: number;
  durationMinutes?: number;
  questionResults: QuestionResult[];
}

export interface DocumentSummary {
  id: number;
  title: string;
  school?: string;
  subject?: string;
  semesterYear?: string;
  type?: string;
  className?: string;
  fileUrl?: string;
  averageRating?: number;
  downloadCount?: number;
  status?: string;
  submittedAt?: string;
  createdAt?: string;
  moderatorNote?: string;
}

export interface DocumentRatingStats {
  average: number;
  count: number;
}

export interface UploadDocumentPayload {
  title: string;
  school?: string;
  subject?: string;
  semesterYear?: string;
  type?: string;
  className?: string;
}

export type AccountStatus = "ACTIVE" | "INACTIVE" | "BANNED";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string;
  roles: string[];
  status: AccountStatus;
  phone?: string;
  birthDate?: string;
  xp: number;
  coinBalance: number;
  streak: number;
  createdAt?: string;
}

export interface UpdateUserProfilePayload {
  name: string;
  email: string;
  status?: AccountStatus;
  phone?: string;
  birthDate?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
