import { apiClient, getStoredAuthToken } from "@/lib/api-client";
import type {
  ComposerAiDraft,
  ComposerAiImportAsset,
  ComposerAiImportJob,
  ComposerExamPayload,
  ComposerExamQuestionLink,
  ComposerExamRecord,
  ComposerQuestionListParams,
  ComposerQuestionPayload,
  ComposerQuestionRecord,
  ComposerSubjectPayload,
  ComposerSubjectRecord,
  ComposerTopicListParams,
  ComposerTopicRecord,
} from "@/features/moderator/types/moderator-composer.type";

const EXAMS_PATH = "/api/exams";
const QUESTIONS_PATH = "/api/questions";
const SUBJECTS_PATH = "/api/subjects";
const TOPICS_PATH = "/api/topics";
const MODERATOR_AI_IMPORTS_PATH = "/api/v1/moderator/exam-imports";
const MODERATOR_LLM_DRAFTS_PATH = "/api/v1/moderator/llm-exam-drafts";

type ApiEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
  items?: unknown;
  exams?: unknown;
  questions?: unknown;
  subjects?: unknown;
  topics?: unknown;
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

function looksLikeMojibake(value: string): boolean {
  return /(Ã.|Â.|Æ.|Ð.|áº|á»|Ä.)/.test(value);
}

function repairMojibakeText(value?: string): string {
  const raw = (value ?? "").trim();
  if (!raw || !looksLikeMojibake(raw)) {
    return raw;
  }

  let repaired = raw;
  for (let index = 0; index < 2; index += 1) {
    try {
      const bytes = Uint8Array.from(repaired, (character) => character.charCodeAt(0) & 0xff);
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!decoded || decoded === repaired) {
        break;
      }

      repaired = decoded;
      if (!looksLikeMojibake(repaired)) {
        break;
      }
    } catch {
      break;
    }
  }

  return repaired;
}

function normalizeVietnameseComparable(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
}

function normalizeAiImportProgressMessage(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = repairMojibakeText(value).trim();
  if (!normalizedValue) {
    return undefined;
  }

  const comparable = normalizeVietnameseComparable(normalizedValue);
  if (comparable === "da nhan file dang xu ly ai" || comparable === "da nhan file dang xu ly ai...") {
    return "Đã nhận file, đang xử lý AI...";
  }

  return normalizedValue;
}

function toTopicTagString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const tags = value
    .map((item) => {
      const objectValue = toObject(item);
      if (!objectValue) {
        return null;
      }
      const name = toStringOrNull(objectValue.name);
      return name?.trim() ? name.trim() : null;
    })
    .filter((item): item is string => Boolean(item));

  return tags.length > 0 ? tags.join(", ") : null;
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
    (objectValue as ApiEnvelope).topics,
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
    description: toStringOrNull(objectValue.description),
    subjectId: toNumber(objectValue.subjectId),
    className: toStringOrNull(objectValue.className ?? objectValue.class_name),
    uploadedBy: toNumber(objectValue.uploadedBy),
    approvedBy: toNumber(objectValue.approvedBy),
    durationMinutes: toNumber(objectValue.durationMinutes),
    status: toStringOrNull(objectValue.status) ?? "DRAFT",
    source: toStringOrNull(objectValue.source),
    moderatorNote: toStringOrNull(objectValue.moderatorNote),
    startAt: toIsoDateTimeOrNull(
      objectValue.startAt ??
      objectValue.start_at ??
      objectValue.startTime ??
      objectValue.start_time
    ),
    endAt: toIsoDateTimeOrNull(
      objectValue.endAt ??
      objectValue.end_at ??
      objectValue.endTime ??
      objectValue.end_time
    ),
    updatedAt: toIsoDateTimeOrNull(objectValue.updatedAt ?? objectValue.updated_at),
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
  const name = repairMojibakeText(toStringOrNull(objectValue.name) ?? "");
  if (id === null || !name) {
    return null;
  }

  return {
    id,
    name,
  };
}

function normalizeTopic(value: unknown): ComposerTopicRecord | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const subjectId = toNumber(objectValue.subjectId);
  const name = toStringOrNull(objectValue.name);
  if (id === null || subjectId === null || !name) {
    return null;
  }

  return {
    id,
    name,
    subjectId,
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
    topicTag: toTopicTagString(objectValue.topicTag),
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
    topicTag: toTopicTagString(objectValue.topicTag),
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

function normalizeAiImportAsset(value: unknown): ComposerAiImportAsset | null {
  const assetObject = toObject(value);
  const assetId = toNumber(assetObject?.id);
  const sourceType = toStringOrNull(assetObject?.sourceType);
  if (!assetObject || assetId === null || !sourceType) {
    return null;
  }

  return {
    id: assetId,
    imageId: toStringOrNull(assetObject.imageId) ?? undefined,
    pageNo: toNumber(assetObject.pageNo),
    originalPage: toNumber(assetObject.originalPage),
    bboxJson: toStringOrNull(assetObject.bboxJson),
    sourceType,
    confidence: toNumber(assetObject.confidence),
    fileUrl: toStringOrNull(assetObject.fileUrl),
    previewUrl: toStringOrNull(assetObject.previewUrl),
    originalFileName: toStringOrNull(assetObject.originalFileName),
    contentType: toStringOrNull(assetObject.contentType),
    fileSize: toNumber(assetObject.fileSize),
    width: toNumber(assetObject.width),
    height: toNumber(assetObject.height),
    extractionOrder: toNumber(assetObject.extractionOrder),
    linkedQuestionOrder: toNumber(assetObject.linkedQuestionOrder),
    createdAt: toIsoDateTimeOrNull(assetObject.createdAt) ?? undefined,
  };
}

function normalizeAiImportJob(value: unknown): ComposerAiImportJob | null {
  const objectValue = toObject(unwrapPayload(value));
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const status = toStringOrNull(objectValue.status);
  const originalFileName = toStringOrNull(objectValue.originalFileName);
  if (id === null || !status || !originalFileName) {
    return null;
  }

  return {
    id,
    status,
    originalFileName,
    contentType: toStringOrNull(objectValue.contentType) ?? undefined,
    fileSize: toNumber(objectValue.fileSize) ?? undefined,
    title: toStringOrNull(objectValue.title) ?? undefined,
    subjectId: toNumber(objectValue.subjectId) ?? undefined,
    className: toStringOrNull(objectValue.className) ?? undefined,
    durationMinutes: toNumber(objectValue.durationMinutes) ?? undefined,
    extractedText: toStringOrNull(objectValue.extractedText) ?? undefined,
    draftJson: toStringOrNull(objectValue.draftJson) ?? undefined,
    errorMessage: toStringOrNull(objectValue.errorMessage) ?? undefined,
    progressPercent: toNumber(objectValue.progressPercent) ?? undefined,
    progressMessage: normalizeAiImportProgressMessage(objectValue.progressMessage),
    createdExamId: toNumber(objectValue.createdExamId) ?? undefined,
    assets: Array.isArray(objectValue.assets)
      ? objectValue.assets
          .map(normalizeAiImportAsset)
          .filter((item): item is ComposerAiImportAsset => item !== null)
      : [],
    createdAt: toIsoDateTimeOrNull(objectValue.createdAt) ?? undefined,
    updatedAt: toIsoDateTimeOrNull(objectValue.updatedAt) ?? undefined,
    completedAt: toIsoDateTimeOrNull(objectValue.completedAt) ?? undefined,
  };
}

function ensureAiImportJob(value: unknown): ComposerAiImportJob {
  const normalized = normalizeAiImportJob(value);
  if (!normalized) {
    throw new Error("Unexpected AI import response shape from backend.");
  }

  return normalized;
}

export function parseModeratorAiDraft(draftJson?: string): ComposerAiDraft | null {
  if (!draftJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(draftJson) as ComposerAiDraft;
    return {
      title: parsed.title ?? "Đề thi AI import",
      subjectId: parsed.subjectId ?? null,
      className: parsed.className ?? "Lớp 12",
      durationMinutes: Number(parsed.durationMinutes ?? 45),
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map((question) => ({
            ...question,
            options: Array.isArray(question.options)
              ? question.options.filter((item): item is string => typeof item === "string")
              : [],
            imageUrls: Array.isArray(question.imageUrls)
              ? question.imageUrls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
              : [],
            selectedImageIds: Array.isArray(question.selectedImageIds)
              ? question.selectedImageIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
              : [],
          }))
        : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      contentEditable: typeof parsed.contentEditable === "boolean" ? parsed.contentEditable : false,
    };
  } catch {
    return null;
  }
}

function ensureModeratorAiDraft(value: unknown): ComposerAiDraft {
  const parsed = parseModeratorAiDraft(JSON.stringify(unwrapPayload(value)));
  if (!parsed) {
    throw new Error("Unexpected AI draft response shape from backend.");
  }

  return parsed;
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

export async function listComposerTopics(params?: ComposerTopicListParams): Promise<ComposerTopicRecord[]> {
  const response = await apiClient.get(TOPICS_PATH, {
    ...buildAuthConfig(),
    params: {
      ...(params?.subjectId ? { subjectId: params.subjectId } : {}),
    },
  });

  return extractArray(response.data)
    .map(normalizeTopic)
    .filter((item): item is ComposerTopicRecord => Boolean(item));
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

export async function uploadModeratorAiImport(payload: {
  file: File;
  title: string;
  subjectId?: number;
  subjectName?: string;
  className?: string;
  durationMinutes?: number;
}): Promise<ComposerAiImportJob> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("title", payload.title);
  if (payload.subjectId !== undefined) {
    formData.append("subjectId", String(payload.subjectId));
  }
  if (payload.subjectName?.trim()) {
    formData.append("subjectName", payload.subjectName.trim());
  }
  if (payload.className?.trim()) {
    formData.append("className", payload.className.trim());
  }
  if (payload.durationMinutes) {
    formData.append("durationMinutes", String(payload.durationMinutes));
  }

  const response = await apiClient.post(MODERATOR_AI_IMPORTS_PATH, formData, buildAuthConfig());
  return ensureAiImportJob(response.data);
}

export async function getModeratorAiImport(jobId: number): Promise<ComposerAiImportJob> {
  const response = await apiClient.get(`${MODERATOR_AI_IMPORTS_PATH}/${jobId}`, buildAuthConfig());
  return ensureAiImportJob(response.data);
}

export async function updateModeratorAiImportDraft(
  jobId: number,
  draft: ComposerAiDraft
): Promise<ComposerAiImportJob> {
  const response = await apiClient.put(
    `${MODERATOR_AI_IMPORTS_PATH}/${jobId}/draft`,
    { draftJson: JSON.stringify(draft) },
    buildAuthConfig()
  );
  return ensureAiImportJob(response.data);
}

export async function uploadModeratorAiImportQuestionImage(
  jobId: number,
  orderIndex: number,
  file: File
): Promise<ComposerAiImportJob> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post(
    `${MODERATOR_AI_IMPORTS_PATH}/${jobId}/questions/${orderIndex}/image`,
    formData,
    buildAuthConfig()
  );
  return ensureAiImportJob(response.data);
}

export async function requestModeratorLlmDraft(payload: {
  file: File;
  title: string;
  subjectId?: number;
  subjectName?: string;
  className?: string;
  durationMinutes?: number;
}): Promise<ComposerAiDraft> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("title", payload.title);
  if (payload.subjectId !== undefined) {
    formData.append("subjectId", String(payload.subjectId));
  }
  if (payload.subjectName?.trim()) {
    formData.append("subjectName", payload.subjectName.trim());
  }
  if (payload.className?.trim()) {
    formData.append("className", payload.className.trim());
  }
  if (payload.durationMinutes) {
    formData.append("durationMinutes", String(payload.durationMinutes));
  }

  const response = await apiClient.post(MODERATOR_LLM_DRAFTS_PATH, formData, buildAuthConfig());
  return ensureModeratorAiDraft(response.data);
}
