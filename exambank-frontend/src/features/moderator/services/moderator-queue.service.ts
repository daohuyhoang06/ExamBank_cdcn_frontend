import { apiClient, getStoredAuthToken } from "@/lib/api-client";

const MODERATOR_REPORTS_PATH = "/api/moderator/reports";

type ApiEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
  items?: unknown;
};

type ReportReason = "COPYRIGHT" | "INCORRECT_CONTENT" | "LOW_QUALITY" | "DUPLICATE" | "OTHER";
type ReportStatus = "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

type ModeratorReportApiRecord = {
  id: number;
  documentId: number | null;
  documentTitle: string | null;
  reporterName: string | null;
  reason: ReportReason;
  status: ReportStatus;
  moderatorNote: string | null;
  resolutionAction: string | null;
  createdAt: string | number | unknown[] | Record<string, unknown> | null;
};

type DocumentApiRecord = {
  id: number;
  title: string;
  school: string | null;
  subject: string | null;
  semesterYear: string | null;
  type: string | null;
  fileType: string | null;
  uploadedByName: string | null;
  submittedAt: string | number | unknown[] | Record<string, unknown> | null;
  createdAt: string | number | unknown[] | Record<string, unknown> | null;
};

export type ModeratorQueueRecord = {
  id: string;
  reportId: number;
  documentId: number;
  title: string;
  subject: string;
  school: string;
  uploader: string;
  uploadedAt: string;
  hasReport: boolean;
  reportReason: string;
  reporterName: string;
  duplicateRisk: "Thấp" | "Vừa" | "Cao";
  level: "THCS" | "THPT";
  pages: number;
  fileType: "PDF" | "DOCX" | "Ảnh";
  category: string;
  tags: string[];
  estimatedDifficulty: number | null;
  durationMinutes: number;
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

  const candidates = [
    (objectValue as ApiEnvelope).content,
    (objectValue as ApiEnvelope).items,
  ];

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

  const parsed = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    Math.floor(nano / 1_000_000)
  );

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

function mapReportReason(reason: ReportReason): string {
  switch (reason) {
    case "COPYRIGHT":
      return "Vi phạm bản quyền";
    case "INCORRECT_CONTENT":
      return "Nội dung sai";
    case "LOW_QUALITY":
      return "Chất lượng thấp";
    case "DUPLICATE":
      return "Trùng lặp";
    default:
      return "Khác";
  }
}

function mapDuplicateRisk(reason: ReportReason): "Thấp" | "Vừa" | "Cao" {
  if (reason === "DUPLICATE" || reason === "COPYRIGHT") {
    return "Cao";
  }

  if (reason === "INCORRECT_CONTENT" || reason === "LOW_QUALITY") {
    return "Vừa";
  }

  return "Thấp";
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

function normalizeModeratorReport(value: unknown): ModeratorReportApiRecord | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const reason = toStringOrNull(objectValue.reason) as ReportReason | null;
  const status = toStringOrNull(objectValue.status) as ReportStatus | null;
  if (id === null || !reason || !status) {
    return null;
  }

  return {
    id,
    documentId: toNumber(objectValue.documentId),
    documentTitle: toStringOrNull(objectValue.documentTitle),
    reporterName: toStringOrNull(objectValue.reporterName),
    reason,
    status,
    moderatorNote: toStringOrNull(objectValue.moderatorNote),
    resolutionAction: toStringOrNull(objectValue.resolutionAction),
    createdAt: (objectValue.createdAt ?? objectValue.created_at) as
      | string
      | number
      | unknown[]
      | Record<string, unknown>
      | null,
  };
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
    fileType: toStringOrNull(objectValue.fileType),
    uploadedByName: toStringOrNull(objectValue.uploadedByName),
    submittedAt: (objectValue.submittedAt ?? objectValue.submitted_at) as
      | string
      | number
      | unknown[]
      | Record<string, unknown>
      | null,
    createdAt: (objectValue.createdAt ?? objectValue.created_at) as
      | string
      | number
      | unknown[]
      | Record<string, unknown>
      | null,
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

async function fetchDocumentMap(documentIds: number[]) {
  const uniqueIds = Array.from(new Set(documentIds));
  if (uniqueIds.length === 0) {
    return new Map<number, DocumentApiRecord>();
  }

  const settled = await Promise.allSettled(
    uniqueIds.map(async (documentId) => {
      const response = await apiClient.get(`/api/documents/${documentId}`, buildAuthConfig());
      return normalizeDocument(response.data);
    })
  );

  const mapped = new Map<number, DocumentApiRecord>();
  for (const result of settled) {
    if (result.status !== "fulfilled" || !result.value) {
      continue;
    }

    mapped.set(result.value.id, result.value);
  }

  return mapped;
}

function toQueueRecord(report: ModeratorReportApiRecord, document: DocumentApiRecord | undefined): ModeratorQueueRecord | null {
  if (!report.documentId) {
    return null;
  }

  const title = document?.title ?? report.documentTitle ?? `Tài liệu #${report.documentId}`;
  const school = document?.school ?? "Chưa cập nhật";
  const subject = document?.subject ?? "Chưa phân môn";
  const uploader = document?.uploadedByName ?? "Người dùng";
  const uploadedAt = formatDateTime(document?.submittedAt ?? document?.createdAt ?? report.createdAt);
  const semesterYear = document?.semesterYear ?? null;
  const category = document?.type ?? "Đề thi học kỳ";
  const tags = [semesterYear, category].filter((item): item is string => Boolean(item && item.trim().length > 0));

  return {
    id: String(report.id),
    reportId: report.id,
    documentId: report.documentId,
    title,
    subject,
    school,
    uploader,
    uploadedAt,
    hasReport: true,
    reportReason: mapReportReason(report.reason),
    reporterName: report.reporterName ?? "Ẩn danh",
    duplicateRisk: mapDuplicateRisk(report.reason),
    level: inferLevel(semesterYear, school),
    pages: 1,
    fileType: mapFileType(document?.fileType ?? null),
    category,
    tags,
    estimatedDifficulty: null,
    durationMinutes: 90,
  };
}

export async function listModeratorQueueItems(reason?: ReportReason): Promise<ModeratorQueueRecord[]> {
  const response = await apiClient.get(
    MODERATOR_REPORTS_PATH,
    {
      ...buildAuthConfig(),
      params: reason ? { reason } : undefined,
    }
  );

  const reports = extractArray(response.data)
    .map(normalizeModeratorReport)
    .filter((item): item is ModeratorReportApiRecord => item !== null)
    .filter((item) => item.status === "PENDING");

  const documentMap = await fetchDocumentMap(
    reports
      .map((item) => item.documentId)
      .filter((item): item is number => typeof item === "number" && Number.isFinite(item))
  );

  return reports
    .map((report) => toQueueRecord(report, report.documentId ? documentMap.get(report.documentId) : undefined))
    .filter((item): item is ModeratorQueueRecord => item !== null);
}

export async function markModeratorQueueItemInReview(record: ModeratorQueueRecord) {
  const response = await apiClient.put(
    `/api/moderator/reports/${record.reportId}/in-review`,
    undefined,
    buildAuthConfig()
  );

  return response.data;
}

export async function approveModeratorQueueItem(record: ModeratorQueueRecord, moderatorNote?: string) {
  const response = await apiClient.put(
    `/api/moderator/reports/${record.reportId}/resolve`,
    {
      action: "REJECTED",
      moderatorNote: moderatorNote?.trim() || "Báo cáo chưa đủ căn cứ, giữ nguyên tài liệu.",
      resolutionAction: "DISMISS",
    },
    buildAuthConfig()
  );

  return response.data;
}

export async function rejectModeratorQueueItem(record: ModeratorQueueRecord, rejectionReason: string) {
  const response = await apiClient.put(
    `/api/moderator/reports/${record.reportId}/resolve`,
    {
      action: "RESOLVED",
      moderatorNote: rejectionReason.trim(),
      resolutionAction: "HIDE_DOCUMENT",
    },
    buildAuthConfig()
  );

  return response.data;
}
