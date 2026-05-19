import { isAxiosError } from "axios";
import { apiClient, getStoredAuthToken } from "@/lib/api-client";

const ADMIN_DOCUMENTS_PATH = "/api/v1/admin/documents";
const MINIO_PUBLIC_ENDPOINT = (import.meta.env.VITE_MINIO_PUBLIC_ENDPOINT ?? "http://localhost:9000").replace(/\/+$/, "");

type ApiEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
  items?: unknown;
};

type AdminDocumentStatus = string;

export type AdminDocumentRecord = {
  id: number;
  title: string;
  school: string | null;
  subject: string | null;
  semester: string | null;
  type: string | null;
  className: string | null;
  status: AdminDocumentStatus | null;
  downloadCount: number | null;
  averageRating: number | null;
  ratingCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  moderatorNote: string | null;
  uploadedByUserId: number | null;
  uploadedByName: string | null;
  approvedByUserId: number | null;
  approvedByName: string | null;
  previewUrl: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
};

export type AdminDocumentStats = {
  totalDocuments: number;
  approvedDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
};

export type AdminDocumentMetadataPayload = {
  title: string;
  school?: string;
  subject?: string;
  semester?: string;
  type?: string;
  className?: string;
  moderatorNote?: string | null;
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

function extractObject(value: unknown): Record<string, unknown> | null {
  const unwrapped = unwrapPayload(value);
  const objectValue = toObject(unwrapped);
  if (objectValue) {
    return objectValue;
  }

  return null;
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

function normalizeDocument(value: unknown): AdminDocumentRecord | null {
  const objectValue = toObject(unwrapPayload(value));
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id);
  const title = toStringOrNull(objectValue.title);
  const rawPreviewUrl = toStringOrNull(objectValue.previewUrl);
  const rawStorageUrl = toStringOrNull(objectValue.fileUrl ?? objectValue.documentUrl);
  const resolvedPreviewUrl = resolveAdminPreviewUrl(rawPreviewUrl, rawStorageUrl);
  if (id === null || !title) {
    return null;
  }

  return {
    id,
    title,
    school: toStringOrNull(objectValue.school),
    subject: toStringOrNull(objectValue.subject),
    semester: toStringOrNull(objectValue.semester),
    type: toStringOrNull(objectValue.type),
    className: toStringOrNull(objectValue.className),
    status: toStringOrNull(objectValue.status),
    downloadCount: toNumber(objectValue.downloadCount),
    averageRating: toNumber(objectValue.averageRating),
    ratingCount: toNumber(objectValue.ratingCount ?? objectValue.totalRatings ?? objectValue.reviewCount),
    commentCount: toNumber(objectValue.commentCount ?? objectValue.totalComments),
    viewCount: toNumber(objectValue.viewCount ?? objectValue.totalViews ?? objectValue.views),
    moderatorNote: toStringOrNull(objectValue.moderatorNote),
    uploadedByUserId: toNumber(objectValue.uploadedByUserId),
    uploadedByName: toStringOrNull(objectValue.uploadedByName),
    approvedByUserId: toNumber(objectValue.approvedByUserId),
    approvedByName: toStringOrNull(objectValue.approvedByName),
    previewUrl: resolvedPreviewUrl,
    submittedAt: toStringOrNull(objectValue.submittedAt),
    updatedAt: toStringOrNull(objectValue.updatedAt),
  };
}

function normalizeStats(value: unknown): AdminDocumentStats {
  const objectValue = extractObject(value) ?? {};

  return {
    totalDocuments: toNumber(objectValue.totalDocuments) ?? 0,
    approvedDocuments: toNumber(objectValue.approvedDocuments) ?? 0,
    pendingDocuments: toNumber(objectValue.pendingDocuments) ?? 0,
    rejectedDocuments: toNumber(objectValue.rejectedDocuments) ?? 0,
  };
}

async function getDocumentsResponse() {
  return apiClient.get(ADMIN_DOCUMENTS_PATH, buildAuthConfig());
}

async function getStatsResponse() {
  return apiClient.get(`${ADMIN_DOCUMENTS_PATH}/stats`, buildAuthConfig());
}

async function getLogsResponse() {
  return apiClient.get(`${ADMIN_DOCUMENTS_PATH}/logs`, buildAuthConfig());
}

async function deleteDocumentResponse(documentId: number) {
  return apiClient.delete(`${ADMIN_DOCUMENTS_PATH}/${documentId}`, buildAuthConfig());
}

async function approveDocumentResponse(documentId: number) {
  return apiClient.put(`/api/v1/moderator/documents/${documentId}/approve`, undefined, buildAuthConfig());
}

async function rejectDocumentResponse(documentId: number, note: string) {
  return apiClient.put(
    `/api/v1/moderator/documents/${documentId}/reject`,
    { note },
    buildAuthConfig(),
  );
}

async function updateDocumentMetadataResponse(documentId: number, payload: AdminDocumentMetadataPayload) {
  return apiClient.put(
    `/api/v1/moderator/documents/${documentId}`,
    payload,
    buildAuthConfig(),
  );
}

function resolveAdminPreviewUrl(
  previewUrl: string | null | undefined,
  storageUrl: string | null | undefined,
) {
  const normalizedStorageUrl = storageUrl?.trim() ?? "";
  const normalizedPreviewUrl = previewUrl?.trim() ?? "";

  if (normalizedStorageUrl.startsWith("storage://")) {
    return toMinioPublicUrl(normalizedStorageUrl);
  }

  if (normalizedPreviewUrl.startsWith("http://") || normalizedPreviewUrl.startsWith("https://")) {
    return toPublicMinioUrlIfInternal(normalizedPreviewUrl);
  }

  return toMinioPublicUrl(normalizedPreviewUrl || normalizedStorageUrl);
}

function toPublicMinioUrlIfInternal(rawUrl: string) {
  try {
    const target = new URL(rawUrl);
    const isInternalMinioHost = target.hostname === "minio";
    if (!isInternalMinioHost) {
      return rawUrl;
    }

    const isPresignedUrl = target.searchParams.has("X-Amz-Signature");
    if (isPresignedUrl) {
      // Signature includes canonical host; rewriting host would invalidate it.
      // Convert to public object URL (no signature), consistent with moderator/user flow.
      return `${MINIO_PUBLIC_ENDPOINT}${target.pathname}`;
    }

    const publicBase = new URL(MINIO_PUBLIC_ENDPOINT);
    target.protocol = publicBase.protocol;
    target.hostname = publicBase.hostname;
    target.port = publicBase.port;
    return target.toString();
  } catch {
    return rawUrl;
  }
}

export async function getAdminDocuments(): Promise<AdminDocumentRecord[]> {
  const response = await getDocumentsResponse();
  return extractArray(response.data).map(normalizeDocument).filter((item): item is AdminDocumentRecord => item !== null);
}

export async function getAdminDocumentStats(): Promise<AdminDocumentStats> {
  const response = await getStatsResponse();
  return normalizeStats(response.data);
}

export async function getAdminDocumentLogs(): Promise<AdminDocumentRecord[]> {
  const response = await getLogsResponse();
  return extractArray(response.data).map(normalizeDocument).filter((item): item is AdminDocumentRecord => item !== null);
}

export async function deleteAdminDocument(documentId: number): Promise<void> {
  try {
    await deleteDocumentResponse(documentId);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Tài liệu không còn tồn tại.");
    }

    throw error;
  }
}

export async function approveAdminDocument(documentId: number): Promise<void> {
  try {
    await approveDocumentResponse(documentId);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Tài liệu không còn tồn tại.");
    }

    throw error;
  }
}

export async function rejectAdminDocument(documentId: number, note = "Từ chối hàng loạt từ admin"): Promise<void> {
  try {
    await rejectDocumentResponse(documentId, note);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Tài liệu không còn tồn tại.");
    }

    throw error;
  }
}

export async function updateAdminDocumentMetadata(
  documentId: number,
  payload: AdminDocumentMetadataPayload,
): Promise<void> {
  const title = payload.title.trim();
  if (!title) {
    throw new Error("Vui lòng nhập tiêu đề.");
  }

  const normalizedPayload: AdminDocumentMetadataPayload = {
    title,
    ...(payload.school?.trim() ? { school: payload.school.trim() } : {}),
    ...(payload.subject?.trim() ? { subject: payload.subject.trim() } : {}),
    ...(payload.semester?.trim() ? { semester: payload.semester.trim() } : {}),
    ...(payload.type?.trim() ? { type: payload.type.trim() } : {}),
    ...(payload.className?.trim() ? { className: payload.className.trim() } : {}),
    ...(payload.moderatorNote !== undefined
      ? { moderatorNote: payload.moderatorNote?.trim() ? payload.moderatorNote.trim() : null }
      : {}),
  };

  try {
    await updateDocumentMetadataResponse(documentId, normalizedPayload);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Tài liệu không còn tồn tại.");
    }

    throw error;
  }
}

function toMinioPublicUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return null;
  }

  const normalized = fileUrl.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${MINIO_PUBLIC_ENDPOINT}${normalized}`;
  }

  if (!normalized.startsWith("storage://")) {
    return `${MINIO_PUBLIC_ENDPOINT}/${normalized.replace(/^\/+/, "")}`;
  }

  const pathWithoutScheme = normalized.slice("storage://".length);
  const firstSlash = pathWithoutScheme.indexOf("/");
  if (firstSlash <= 0) {
    return null;
  }

  const bucket = pathWithoutScheme.slice(0, firstSlash);
  const objectKey = pathWithoutScheme.slice(firstSlash + 1);
  const encodedObjectKey = objectKey
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const isR2PublicDev = MINIO_PUBLIC_ENDPOINT.includes(".r2.dev");
  const bucketSegment = isR2PublicDev ? "" : `/${encodeURIComponent(bucket)}`;
  return `${MINIO_PUBLIC_ENDPOINT}${bucketSegment}/${encodedObjectKey}`;
}
