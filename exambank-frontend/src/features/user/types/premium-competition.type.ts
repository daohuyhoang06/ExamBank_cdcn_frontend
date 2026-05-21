export type ExamDraftQuestion = {
  content: string;
  type: "MCQ" | "FILL_IN_BLANK" | "TRUE_FALSE";
  options: string[];
  answer: string;
  answerExplanation?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  difficulty?: number;
  maxScore?: number;
  orderIndex?: number;
  needsReview?: boolean;
};

export type ExamDraft = {
  title: string;
  subjectId: number | null;
  className: string;
  durationMinutes: number;
  questions: ExamDraftQuestion[];
  warnings?: string[];
};

export type ExamImportJob = {
  id: number;
  status: string;
  originalFileName: string;
  contentType?: string;
  fileSize?: number;
  title?: string;
  subjectId?: number;
  className?: string;
  durationMinutes?: number;
  extractedText?: string;
  draftJson?: string;
  errorMessage?: string;
  createdExamId?: number;
  assets?: ExamImportAsset[];
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
};

export type ExamImportAsset = {
  id: number;
  pageNo?: number | null;
  bboxJson?: string | null;
  sourceType: string;
  confidence?: number | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  originalFileName?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  linkedQuestionOrder?: number | null;
  createdAt?: string;
};

export type PremiumCompetition = {
  id: number;
  examId: number;
  examTitle?: string;
  title: string;
  accessCode: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | string;
  startAt?: string | null;
  endAt?: string | null;
  maxAttemptsPerUser?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SubjectOption = {
  id: number;
  name: string;
};

export type CompetitionAccessResult = {
  competitionId: number;
  examId: number;
  accessCode: string;
  title: string;
  granted: boolean;
};
