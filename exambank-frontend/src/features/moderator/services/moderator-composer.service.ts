import { apiClient, getStoredAuthToken } from "@/lib/api-client";
import type {
  ComposerExamPayload,
  ComposerExamQuestionLink,
  ComposerExamRecord,
  ComposerQuestionListParams,
  ComposerQuestionPayload,
  ComposerQuestionRecord,
  ComposerSubjectPayload,
  ComposerSubjectRecord,
} from "@/features/moderator/types/moderator-composer.type";

const EXAMS_PATH = "/api/exams";
const QUESTIONS_PATH = "/api/questions";
const SUBJECTS_PATH = "/api/subjects";

type ApiEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
  items?: unknown;
  exams?: unknown;
  questions?: unknown;
  subjects?: unknown;
};

function toObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toIsoDateTimeOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Math.floor(Number(nano) / 1_000_000)
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const year = toNumber(objectValue.year);
  const month = toNumber(objectValue.monthValue ?? objectValue.month);
  const day = toNumber(objectValue.dayOfMonth ?? objectValue.day);

  if (year === null || month === null || day === null) {
    return null;
  }

  const hour = toNumber(objectValue.hour) ?? 0;
  const minute = toNumber(objectValue.minute) ?? 0;
  const second = toNumber(objectValue.second) ?? 0;
  const nano = toNumber(objectValue.nano) ?? 0;

  const parsed = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    Math.floor(nano / 1_000_000)
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

function unwrapPayload(value: unknown): unknown {
  let current = value;

  for (let depth = 0; depth < 4; depth += 1) {
    const objectValue = toObject(current);
    if (!objectValue) {
      return current;
    }

    const wrapped = objectValue as ApiEnvelope;
    const next = wrapped.data ?? wrapped.result ?? wrapped.payload;
    if (next === undefined) {
      return current;
    }

    current = next;
  }

  return current;
}

function extractArray(value: unknown): unknown[] {
  const unwrapped = unwrapPayload(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  const objectValue = toObject(unwrapped);
  if (!objectValue) {
    return [];
  }

  const candidates = [
    (objectValue as ApiEnvelope).content,
    (objectValue as ApiEnvelope).items,
    (objectValue as ApiEnvelope).exams,
    (objectValue as ApiEnvelope).questions,
    (objectValue as ApiEnvelope).subjects,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function buildAuthConfig() {
  const token = getStoredAuthToken();
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;
}

function normalizeExam(value: unknown): ComposerExamRecord | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const title = toStringOrNull(objectValue.title);
  if (id === null || !title) {
    return null;
  }

  return {
    id,
    title,
    subjectId: toNumber(objectValue.subjectId),
    className: toStringOrNull(objectValue.className ?? objectValue.class_name),
    uploadedBy: toNumber(objectValue.uploadedBy),
    approvedBy: toNumber(objectValue.approvedBy),
    durationMinutes: toNumber(objectValue.durationMinutes),
    status: toStringOrNull(objectValue.status) ?? "DRAFT",
    moderatorNote: toStringOrNull(objectValue.moderatorNote),
    publishedAt: toIsoDateTimeOrNull(objectValue.publishedAt ?? objectValue.published_at),
    createdAt: toIsoDateTimeOrNull(objectValue.createdAt ?? objectValue.created_at),
  };
}

function normalizeSubject(value: unknown): ComposerSubjectRecord | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const name = toStringOrNull(objectValue.name);
  if (id === null || !name) {
    return null;
  }

  return {
    id,
    name,
  };
}

function normalizeQuestion(value: unknown): ComposerQuestionRecord | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const subjectId = toNumber(objectValue.subjectId);
  const content = toStringOrNull(objectValue.content);
  if (id === null || subjectId === null || !content) {
    return null;
  }

  return {
    id,
    examId: toNumber(objectValue.examId),
    subjectId,
    content,
    type: toStringOrNull(objectValue.type) ?? "MCQ",
    topicTag: toStringOrNull(objectValue.topicTag),
    maxScore: toNumber(objectValue.maxScore),
    options: toStringOrNull(objectValue.options),
    answer: toStringOrNull(objectValue.answer),
    answerExplanation: toStringOrNull(objectValue.answerExplanation),
    imageUrl: toStringOrNull(objectValue.imageUrl),
    difficulty: toNumber(objectValue.difficulty),
    orderIndex: toNumber(objectValue.orderIndex),
    active: toBoolean(objectValue.active, true),
  };
}

function normalizeExamQuestionLink(value: unknown): ComposerExamQuestionLink | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const questionId = toNumber(objectValue.questionId);
  if (id === null || questionId === null) {
    return null;
  }

  return {
    id,
    questionId,
    content: toStringOrNull(objectValue.content),
    options: toStringOrNull(objectValue.options),
    answer: toStringOrNull(objectValue.answer),
    difficulty: toNumber(objectValue.difficulty),
    topicTag: toStringOrNull(objectValue.topicTag),
    orderIndex: toNumber(objectValue.orderIndex),
  };
}

function ensureExam(value: unknown): ComposerExamRecord {
  const normalized = normalizeExam(unwrapPayload(value));
  if (!normalized) {
    throw new Error("Unexpected exam response shape from backend.");
  }

  return normalized;
}

function ensureQuestion(value: unknown): ComposerQuestionRecord {
  const normalized = normalizeQuestion(unwrapPayload(value));
  if (!normalized) {
    throw new Error("Unexpected question response shape from backend.");
  }

  return normalized;
}

function ensureSubject(value: unknown): ComposerSubjectRecord {
  const normalized = normalizeSubject(unwrapPayload(value));
  if (!normalized) {
    throw new Error("Unexpected subject response shape from backend.");
  }

  return normalized;
}

export async function listComposerExams(): Promise<ComposerExamRecord[]> {
  const response = await apiClient.get(EXAMS_PATH, buildAuthConfig());
  return extractArray(response.data)
    .map(normalizeExam)
    .filter((item): item is ComposerExamRecord => Boolean(item));
}

export async function listComposerOwnedExams(): Promise<ComposerExamRecord[]> {
  const response = await apiClient.get(`${EXAMS_PATH}/mine`, buildAuthConfig());
  return extractArray(response.data)
    .map(normalizeExam)
    .filter((item): item is ComposerExamRecord => Boolean(item));
}

export async function getComposerExamById(examId: number): Promise<ComposerExamRecord> {
  const response = await apiClient.get(`${EXAMS_PATH}/${examId}`, buildAuthConfig());
  return ensureExam(response.data);
}

export async function createComposerExam(payload: ComposerExamPayload): Promise<ComposerExamRecord> {
  const response = await apiClient.post(EXAMS_PATH, payload, buildAuthConfig());
  return ensureExam(response.data);
}

export async function updateComposerExam(examId: number, payload: ComposerExamPayload): Promise<ComposerExamRecord> {
  const response = await apiClient.put(`${EXAMS_PATH}/${examId}`, payload, buildAuthConfig());
  return ensureExam(response.data);
}

export async function deleteComposerExam(examId: number): Promise<void> {
  await apiClient.delete(`${EXAMS_PATH}/${examId}`, buildAuthConfig());
}

export async function listComposerSubjects(): Promise<ComposerSubjectRecord[]> {
  const response = await apiClient.get(SUBJECTS_PATH, buildAuthConfig());
  return extractArray(response.data)
    .map(normalizeSubject)
    .filter((item): item is ComposerSubjectRecord => Boolean(item));
}

export async function createComposerSubject(payload: ComposerSubjectPayload): Promise<ComposerSubjectRecord> {
  const response = await apiClient.post(SUBJECTS_PATH, payload, buildAuthConfig());
  return ensureSubject(response.data);
}

export async function listComposerQuestions(params?: ComposerQuestionListParams): Promise<ComposerQuestionRecord[]> {
  const response = await apiClient.get(QUESTIONS_PATH, {
    ...buildAuthConfig(),
    params: {
      ...(params?.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params?.topicTag ? { topicTag: params.topicTag } : {}),
    },
  });

  return extractArray(response.data)
    .map(normalizeQuestion)
    .filter((item): item is ComposerQuestionRecord => Boolean(item));
}

export async function getComposerQuestionById(questionId: number): Promise<ComposerQuestionRecord> {
  const response = await apiClient.get(`${QUESTIONS_PATH}/${questionId}`, buildAuthConfig());
  return ensureQuestion(response.data);
}

export async function createComposerQuestion(payload: ComposerQuestionPayload): Promise<ComposerQuestionRecord> {
  const response = await apiClient.post(QUESTIONS_PATH, payload, buildAuthConfig());
  return ensureQuestion(response.data);
}

export async function updateComposerQuestion(
  questionId: number,
  payload: ComposerQuestionPayload
): Promise<ComposerQuestionRecord> {
  const response = await apiClient.put(`${QUESTIONS_PATH}/${questionId}`, payload, buildAuthConfig());
  return ensureQuestion(response.data);
}

export async function deleteComposerQuestion(questionId: number): Promise<void> {
  await apiClient.delete(`${QUESTIONS_PATH}/${questionId}`, buildAuthConfig());
}

export async function uploadComposerQuestionImage(
  questionId: number,
  file: File
): Promise<ComposerQuestionRecord> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post(`${QUESTIONS_PATH}/${questionId}/image`, formData, buildAuthConfig());
  try {
    return ensureQuestion(response.data);
  } catch {
    // Some backend builds return a partial DTO for image upload.
    // Re-fetch canonical question data to keep frontend flow stable.
    return getComposerQuestionById(questionId);
  }
}

export async function removeComposerQuestionImage(questionId: number): Promise<ComposerQuestionRecord> {
  const response = await apiClient.delete(`${QUESTIONS_PATH}/${questionId}/image`, buildAuthConfig());
  return ensureQuestion(response.data);
}

export async function listComposerExamQuestions(examId: number): Promise<ComposerExamQuestionLink[]> {
  const response = await apiClient.get(`${EXAMS_PATH}/${examId}/questions`, buildAuthConfig());
  return extractArray(response.data)
    .map(normalizeExamQuestionLink)
    .filter((item): item is ComposerExamQuestionLink => Boolean(item));
}

export async function attachComposerExamQuestions(
  examId: number,
  questionIds: number[]
): Promise<ComposerExamQuestionLink[]> {
  const response = await apiClient.post(
    `${EXAMS_PATH}/${examId}/questions`,
    {
      questionIds,
    },
    buildAuthConfig()
  );

  return extractArray(response.data)
    .map(normalizeExamQuestionLink)
    .filter((item): item is ComposerExamQuestionLink => Boolean(item));
}

export async function removeComposerExamQuestion(examId: number, questionId: number): Promise<void> {
  await apiClient.delete(`${EXAMS_PATH}/${examId}/questions/${questionId}`, buildAuthConfig());
}
