export type BackendExamStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "ONGOING"
  | "CLOSED"
  | "LOCKED"
  | "REJECTED"
  | string;

export type ComposerExamRecord = {
  id: number;
  title: string;
  description?: string | null;
  subjectId: number | null;
  className: string | null;
  uploadedBy: number | null;
  approvedBy: number | null;
  durationMinutes: number | null;
  status: BackendExamStatus;
  moderatorNote: string | null;
  startAt?: string | null;
  endAt?: string | null;
  updatedAt?: string | null;
  publishedAt: string | null;
  createdAt: string | null;
};

export type ComposerExamPayload = {
  title: string;
  description?: string | null;
  subjectId: number;
  className?: string | null;
  uploadedBy?: number | null;
  approvedBy?: number | null;
  durationMinutes?: number | null;
  status?: BackendExamStatus;
  moderatorNote?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  updatedAt?: string | null;
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

export type ComposerTopicRecord = {
  id: number;
  name: string;
  subjectId: number;
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

export type ComposerTopicListParams = {
  subjectId?: number;
};

export type ComposerAiDraftQuestion = {
  content: string;
  latexContent?: string;
  contentEditable?: boolean;
  detectedNumber?: number;
  type: "MCQ" | "FILL_IN_BLANK" | "TRUE_FALSE";
  options: string[];
  answer: string;
  answerExplanation?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  selectedImageIds?: string[];
  difficulty?: number;
  maxScore?: number;
  orderIndex?: number;
  pageNo?: number | null;
  needsReview?: boolean;
};

export type ComposerAiDraft = {
  title: string;
  subjectId: number | null;
  className: string;
  durationMinutes: number;
  questions: ComposerAiDraftQuestion[];
  warnings?: string[];
  contentEditable?: boolean;
};

export type ComposerAiImportAsset = {
  id: number;
  imageId?: string;
  pageNo?: number | null;
  originalPage?: number | null;
  bboxJson?: string | null;
  sourceType: string;
  confidence?: number | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  originalFileName?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  extractionOrder?: number | null;
  linkedQuestionOrder?: number | null;
  createdAt?: string;
};

export type ComposerAiImportJob = {
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
  progressPercent?: number;
  progressMessage?: string;
  createdExamId?: number;
  assets?: ComposerAiImportAsset[];
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
};
