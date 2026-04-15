import { apiClient, getStoredAuthToken } from "@/lib/api-client";

const MODERATOR_DOCUMENTS_PATH = "/api/v1/moderator/documents";


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
  moderatorNote?: string;
};

export type ModeratorDocumentPreview = {
  fileUrl: string | null;
  fileType: string | null;
};

export type ModeratorQueueMetrics = {
  totalDocuments: number;
  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
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

function toMonthNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    return normalized >= 1 && normalized <= 12 ? normalized : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null;
  }

  const monthByName: Record<string, number> = {
    JANUARY: 1,
    FEBRUARY: 2,
    MARCH: 3,
    APRIL: 4,
    MAY: 5,
    JUNE: 6,
    JULY: 7,
    AUGUST: 8,
    SEPTEMBER: 9,
    OCTOBER: 10,
    NOVEMBER: 11,
    DECEMBER: 12,
  };

  return monthByName[normalized] ?? null;
}

function parseApiDateString(value: string): Date | null {
  const raw = value.trim();
  if (!raw) {
    return null;
  }

  if (/^\d{10,13}$/.test(raw)) {
    const parsedNumber = Number(raw);
    if (!Number.isFinite(parsedNumber)) {
      return null;
    }

    const millis = raw.length <= 10 ? parsedNumber * 1000 : parsedNumber;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const withoutZoneName = raw.replace(/\[[^\]]+\]$/, "");
  const normalized = withoutZoneName.includes(" ") ? withoutZoneName.replace(" ", "T") : withoutZoneName;
  const isoMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(normalized);

  if (isoMatch) {
    const [, year, month, day, hour, minute, secondRaw, fractionRaw, zoneRaw] = isoMatch;
    const second = secondRaw ?? "00";
    const millisecond = (fractionRaw ?? "").slice(0, 3).padEnd(3, "0");

    if (zoneRaw) {
      const zone =
        zoneRaw === "Z" || zoneRaw.includes(":")
          ? zoneRaw
          : `${zoneRaw.slice(0, 3)}:${zoneRaw.slice(3)}`;

      const isoWithZone = `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}${zone}`;
      const parsed = new Date(isoWithZone);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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
    return parseApiDateString(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    const parsed = new Date(millis);
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
  const month = toMonthNumber(objectValue.monthValue ?? objectValue.month);
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
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(parsed);
}

function resolveQueueTimestamp(document: DocumentApiRecord): unknown {
  return document.submittedAt ?? document.createdAt ?? document.publishedAt;
}

function toQueueTimestampMillis(document: DocumentApiRecord): number {
  const parsed = parseApiDateTime(resolveQueueTimestamp(document));
  return parsed?.getTime() ?? 0;
}

function mapFileType(value: string | null, fileUrl?: string | null): "PDF" | "DOCX" | "Ảnh" {
  const normalized = `${value ?? ""} ${fileUrl ?? ""}`.toLowerCase();
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

  if (normalized.includes("pdf")) {
    return "PDF";
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
    semesterYear: toStringOrNull(objectValue.semesterYear ?? objectValue.semester),
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
  const normalizedToken = token?.replace(/^Bearer\s+/i, "").trim();
  return normalizedToken
    ? {
        headers: {
          Authorization: `Bearer ${normalizedToken}`,
        },
      }
    : undefined;
}

async function listModeratorDocuments(): Promise<DocumentApiRecord[]> {
  const response = await apiClient.get(`${MODERATOR_DOCUMENTS_PATH}/queue`, buildAuthConfig());

  return extractArray(response.data)
    .map(normalizeDocument)
    .filter((item): item is DocumentApiRecord => item !== null);
}

async function enrichDocumentsWithPreview(documents: DocumentApiRecord[]): Promise<DocumentApiRecord[]> {
  const enriched = await Promise.all(
    documents.map(async (document) => {
      try {
        const preview = await getModeratorDocumentPreview(document.id);
        return {
          ...document,
          fileUrl: preview.fileUrl ?? document.fileUrl,
          fileType: preview.fileType ?? document.fileType,
        };
      } catch {
        return document;
      }
    })
  );

  return enriched;
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
    uploadedAt: formatDateTime(resolveQueueTimestamp(document)),
    status: document.status,
    moderatorNote: document.moderatorNote,
    level: inferLevel(semesterYear, school),
    pages: 1,
    fileType: mapFileType(document.fileType, document.fileUrl),
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
  const documents = await listModeratorDocuments();
  const documentsWithPreview = await enrichDocumentsWithPreview(documents);

  return documentsWithPreview
    .sort((left, right) => {
      const timestampDiff = toQueueTimestampMillis(right) - toQueueTimestampMillis(left);
      if (timestampDiff !== 0) {
        return timestampDiff;
      }

      return right.id - left.id;
    })
    .map(toQueueRecord);
}

export async function getModeratorQueueMetrics(): Promise<ModeratorQueueMetrics> {
  const documents = await listModeratorDocuments();

  const pendingDocuments = documents.filter((item) => {
    const normalizedStatus = (item.status ?? "").toUpperCase();
    return normalizedStatus === "PENDING" || normalizedStatus === "PENDING_REVIEW";
  }).length;

  const approvedDocuments = documents.filter((item) => {
    const normalizedStatus = (item.status ?? "").toUpperCase();
    return normalizedStatus === "APPROVED" || normalizedStatus === "TRANSFORMED";
  }).length;

  const rejectedDocuments = documents.filter(
    (item) => (item.status ?? "").toUpperCase() === "REJECTED"
  ).length;

  return {
    totalDocuments: documents.length,
    pendingDocuments,
    approvedDocuments,
    rejectedDocuments,
  };
}

export async function updateModeratorQueueMetadata(record: ModeratorQueueRecord, payload: ModeratorMetadataPayload) {
  const title = payload.title.trim();
  if (!title) {
    throw new Error("Vui lòng nhập tiêu đề.");
  }

  const response = await apiClient.put(
    `${MODERATOR_DOCUMENTS_PATH}/${record.documentId}`,
    {
      title,
      ...(payload.school?.trim() ? { school: payload.school.trim() } : {}),
      ...(payload.subject?.trim() ? { subject: payload.subject.trim() } : {}),
      ...(payload.semesterYear?.trim() ? { semester: payload.semesterYear.trim() } : {}),
      ...(payload.type?.trim() ? { type: payload.type.trim() } : {}),
      ...(payload.lecturer?.trim() ? { lecturer: payload.lecturer.trim() } : {}),
      ...(payload.moderatorNote?.trim() ? { moderatorNote: payload.moderatorNote.trim() } : { moderatorNote: null }),
    },
    buildAuthConfig()
  );

  return response.data;
}

export async function approveModeratorQueueItem(record: ModeratorQueueRecord, moderatorNote?: string) {
  const trimmedNote = moderatorNote?.trim();
  const response = await apiClient.put(
    `${MODERATOR_DOCUMENTS_PATH}/${record.documentId}/approve`,
    trimmedNote ? { note: trimmedNote } : undefined,
    buildAuthConfig()
  );
  return response.data;
}

export async function rejectModeratorQueueItem(record: ModeratorQueueRecord, rejectionReason: string) {
  const finalReason = rejectionReason.trim();
  if (!finalReason) {
    throw new Error("Vui lòng nhập lý do từ chối.");
  }

  const response = await apiClient.put(
    `${MODERATOR_DOCUMENTS_PATH}/${record.documentId}/reject`,
    { note: finalReason },
    buildAuthConfig()
  );

  return response.data;
}

export async function getModeratorDocumentPreview(documentId: number): Promise<ModeratorDocumentPreview> {
  const response = await apiClient.get(`${MODERATOR_DOCUMENTS_PATH}/compare`, {
    ...buildAuthConfig(),
    params: {
      docId1: documentId,
      docId2: documentId,
    },
  });

  const payload = toObject(unwrapPayload(response.data));
  const left = payload ? toObject(payload.left) : null;
  const target = left ?? payload;

  if (!target) {
    return { fileUrl: null, fileType: null };
  }

  return {
    fileUrl: toStringOrNull(target.previewUrl ?? target.fileUrl),
    fileType: toStringOrNull(target.fileType),
  };
}


