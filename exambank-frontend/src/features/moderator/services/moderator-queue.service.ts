
import { apiClient, getStoredAuthToken } from "@/lib/api-client";

const MODERATOR_DOCUMENTS_PATH = "/api/moderator/documents";
const DOCUMENTS_PATH = "/api/documents";


type ApiEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
  items?: unknown;
};


type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED" | "PENDING_REVIEW" | "TRANSFORMED" | string;

type DocumentApiRecord = {
  id: number;
  title: string;
  school: string | null;
  subject: string | null;
  semesterYear: string | null;
  type: string | null;
  lecturer: string | null;
  fileUrl: string | null;
  fileType: string | null;
  status: DocumentStatus;
  downloadCount: number | null;
  moderatorNote: string | null;
  uploadedByName: string | null;
  submittedAt: string | number | unknown[] | Record<string, unknown> | null;
  publishedAt: string | number | unknown[] | Record<string, unknown> | null;
  createdAt: string | number | unknown[] | Record<string, unknown> | null;
};

export type ModeratorQueueRecord = {
  id: string;
  documentId: number;
  title: string;
  subject: string;
  school: string;
  uploader: string;
  uploadedAt: string;
  status: DocumentStatus;
  moderatorNote: string | null;
  level: "THCS" | "THPT";
  pages: number;
  fileType: "PDF" | "DOCX" | "Ảnh";
  category: string;
  semesterYear: string;
  lecturer: string;
  fileUrl: string | null;
  downloadCount: number;
  tags: string[];
  estimatedDifficulty: number | null;
  durationMinutes: number;
};

export type ModeratorMetadataPayload = {
  title: string;
  school?: string;
  subject?: string;
  semesterYear?: string;
  type?: string;
  lecturer?: string;
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
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

  const candidates = [(objectValue as ApiEnvelope).content, (objectValue as ApiEnvelope).items];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function parseApiDateTime(value: unknown): Date | null {
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

  const parsed = new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1_000_000));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value: unknown): string {
  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function toDateTimestamp(value: unknown): number {
  const parsed = parseApiDateTime(value);
  return parsed ? parsed.getTime() : 0;
}

function mapFileType(value: string | null): "PDF" | "DOCX" | "Ảnh" {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("doc")) {
    return "DOCX";
  }

  if (
    normalized.includes("png") ||
    normalized.includes("jpg") ||
    normalized.includes("jpeg") ||
    normalized.includes("webp") ||
    normalized.includes("image")
  ) {
    return "Ảnh";
  }

  return "PDF";
}

function inferLevel(semesterYear: string | null, school: string | null): "THCS" | "THPT" {
  const text = `${semesterYear ?? ""} ${school ?? ""}`.toLowerCase();
  if (text.includes("6") || text.includes("7") || text.includes("8") || text.includes("9") || text.includes("thcs")) {
    return "THCS";
  }

  return "THPT";
}

function normalizeStatus(value: unknown): DocumentStatus {
  const status = toStringOrNull(value)?.toUpperCase();
  if (!status) {
    return "PENDING";
  }

  return status;
}

function normalizeDocument(value: unknown): DocumentApiRecord | null {
  const unwrapped = unwrapPayload(value);
  const objectValue = toObject(unwrapped);
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
    school: toStringOrNull(objectValue.school),
    subject: toStringOrNull(objectValue.subject),
    semesterYear: toStringOrNull(objectValue.semesterYear),
    type: toStringOrNull(objectValue.type),
    lecturer: toStringOrNull(objectValue.lecturer),
    fileUrl: toStringOrNull(objectValue.fileUrl),
    fileType: toStringOrNull(objectValue.fileType),
    status: normalizeStatus(objectValue.status),
    downloadCount: toNumber(objectValue.downloadCount),
    moderatorNote: toStringOrNull(objectValue.moderatorNote),
    uploadedByName: toStringOrNull(objectValue.uploadedByName),
    submittedAt: (objectValue.submittedAt ?? objectValue.submitted_at) as string | number | unknown[] | Record<string, unknown> | null,
    publishedAt: (objectValue.publishedAt ?? objectValue.published_at) as string | number | unknown[] | Record<string, unknown> | null,
    createdAt: (objectValue.createdAt ?? objectValue.created_at) as string | number | unknown[] | Record<string, unknown> | null,
  };
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

async function listModeratorDocuments(): Promise<DocumentApiRecord[]> {
  const response = await apiClient.get(MODERATOR_DOCUMENTS_PATH, buildAuthConfig());

  return extractArray(response.data)
    .map(normalizeDocument)
    .filter((item): item is DocumentApiRecord => item !== null);
}

async function listAllDocuments(): Promise<DocumentApiRecord[]> {
  const response = await apiClient.get(DOCUMENTS_PATH, {
    ...buildAuthConfig(),
    params: { page: 0, size: 200 },
  });

  return extractArray(response.data)
    .map(normalizeDocument)
    .filter((item): item is DocumentApiRecord => item !== null);
}

function toQueueRecord(document: DocumentApiRecord): ModeratorQueueRecord {
  const school = document.school ?? "Chưa cập nhật";
  const subject = document.subject ?? "Chưa phân môn";
  const semesterYear = document.semesterYear ?? "";
  const category = document.type ?? "Đề thi học kỳ";
  const tags = [semesterYear, category].filter((item): item is string => Boolean(item && item.trim().length > 0));

  return {
    id: String(document.id),
    documentId: document.id,
    title: document.title,
    subject,
    school,
    uploader: document.uploadedByName ?? "Người dùng",
    uploadedAt: formatDateTime(document.submittedAt ?? document.createdAt),
    status: document.status,
    moderatorNote: document.moderatorNote,
    level: inferLevel(semesterYear, school),
    pages: 1,
    fileType: mapFileType(document.fileType),
    category,
    semesterYear,
    lecturer: document.lecturer ?? "",
    fileUrl: document.fileUrl,
    downloadCount: document.downloadCount ?? 0,
    tags,
    estimatedDifficulty: null,
    durationMinutes: 90,
  };
}

export async function listModeratorQueueItems(): Promise<ModeratorQueueRecord[]> {
  const [moderatorResult, allDocumentsResult] = await Promise.allSettled([
    listModeratorDocuments(),
    listAllDocuments(),
  ]);

  if (moderatorResult.status === "rejected" && allDocumentsResult.status === "rejected") {
    throw moderatorResult.reason;
  }

  const merged = new Map<number, DocumentApiRecord>();

  if (allDocumentsResult.status === "fulfilled") {
    for (const item of allDocumentsResult.value) {
      merged.set(item.id, item);
    }
  }

  if (moderatorResult.status === "fulfilled") {
    for (const item of moderatorResult.value) {
      merged.set(item.id, item);
    }
  }

  return Array.from(merged.values())
    .sort((first, second) => {
      const secondTime = toDateTimestamp(second.submittedAt ?? second.createdAt ?? second.publishedAt);
      const firstTime = toDateTimestamp(first.submittedAt ?? first.createdAt ?? first.publishedAt);
      return secondTime - firstTime;
    })
    .map(toQueueRecord);
}

export async function updateModeratorQueueMetadata(record: ModeratorQueueRecord, payload: ModeratorMetadataPayload) {
  const title = payload.title.trim();
  if (!title) {
    throw new Error("Vui lòng nhập tiêu đề.");
  }

  const response = await apiClient.put(`/api/moderator/documents/${record.documentId}/metadata`, undefined, {
    ...buildAuthConfig(),
    params: {
      title,
      ...(payload.school?.trim() ? { school: payload.school.trim() } : {}),
      ...(payload.subject?.trim() ? { subject: payload.subject.trim() } : {}),
      ...(payload.semesterYear?.trim() ? { semesterYear: payload.semesterYear.trim() } : {}),
      ...(payload.type?.trim() ? { type: payload.type.trim() } : {}),
      ...(payload.lecturer?.trim() ? { lecturer: payload.lecturer.trim() } : {}),
    },
  });

  return response.data;
}

export async function approveModeratorQueueItem(record: ModeratorQueueRecord, moderatorNote?: string) {
  const trimmedNote = moderatorNote?.trim();
  const response = await apiClient.put(`/api/moderator/documents/${record.documentId}/approve`, undefined, {
    ...buildAuthConfig(),
    params: trimmedNote ? { moderatorNote: trimmedNote } : undefined,
  });
  return response.data;
}

export async function rejectModeratorQueueItem(record: ModeratorQueueRecord, rejectionReason: string) {
  const finalReason = rejectionReason.trim();
  if (!finalReason) {
    throw new Error("Vui lòng nhập lý do từ chối.");
  }

  const response = await apiClient.put(
    `/api/moderator/documents/${record.documentId}/reject`,
    {
      moderatorNote: finalReason,
      rejectionReason: finalReason,
    },
    buildAuthConfig()
  );

  return response.data;
}
