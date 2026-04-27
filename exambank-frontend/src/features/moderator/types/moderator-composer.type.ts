export type BackendExamStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | string;

export type ComposerExamRecord = {
  id: number;
  title: string;
  subjectId: number | null;
  className: string | null;
  uploadedBy: number | null;
  approvedBy: number | null;
  durationMinutes: number | null;
  status: BackendExamStatus;
  moderatorNote: string | null;
  publishedAt: string | null;
  createdAt: string | null;
};

export type ComposerExamPayload = {
  title: string;
  subjectId: number;
  className?: string | null;
  uploadedBy?: number | null;
  approvedBy?: number | null;
  durationMinutes?: number | null;
  status?: BackendExamStatus;
  moderatorNote?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
};

export type ComposerSubjectRecord = {
  id: number;
  name: string;
};

export type ComposerSubjectPayload = {
  name: string;
};

export type ComposerQuestionType = "MCQ" | "FILL_IN_BLANK" | "ESSAY" | string;

export type ComposerQuestionRecord = {
  id: number;
  examId: number | null;
  subjectId: number;
  content: string;
  type: ComposerQuestionType;
  topicTag: string | null;
  maxScore: number | null;
  options: string | null;
  answer: string | null;
  answerExplanation: string | null;
  imageUrl: string | null;
  difficulty: number | null;
  orderIndex: number | null;
  active: boolean;
};

export type ComposerQuestionPayload = {
  examId?: number | null;
  subjectId: number;
  content: string;
  type: ComposerQuestionType;
  topicTag?: string | null;
  maxScore?: number | null;
  options?: string | null;
  answer?: string | null;
  answerExplanation?: string | null;
  imageUrl?: string | null;
  difficulty?: number | null;
  orderIndex?: number | null;
  active?: boolean;
};

export type ComposerExamQuestionLink = {
  id: number;
  questionId: number;
  content: string | null;
  options: string | null;
  answer: string | null;
  difficulty: number | null;
  topicTag: string | null;
  orderIndex: number | null;
};

export type ComposerQuestionListParams = {
  subjectId?: number;
  topicTag?: string;
};
