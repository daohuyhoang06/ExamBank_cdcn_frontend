import { apiClient } from "@/lib/api-client";

const NOTIFICATIONS_PATH = "/api/v1/notifications";

type ApiEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
};

export type NotificationView = {
  id: number;
  userId: number;
  type: string | null;
  title: string;
  message: string;
  targetId: number | null;
  targetType: string | null;
  read: boolean;
  createdAt: string | null;
};

export type NotificationPageResponse = {
  items: NotificationView[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const toObject = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toStringOrEmpty = (value: unknown): string => {
  return toStringOrNull(value) ?? "";
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return false;
};

const unwrapEnvelope = <T,>(payload: unknown): T => {
  const envelope = toObject(payload) as ApiEnvelope | null;
  if (!envelope) {
    return payload as T;
  }

  return (envelope.data ?? envelope.result ?? envelope.payload ?? payload) as T;
};

const mapNotificationView = (value: unknown): NotificationView | null => {
  const obj = toObject(value);
  if (!obj) {
    return null;
  }

  const id = toNumber(obj.id);
  if (id === null) {
    return null;
  }

  const userId = toNumber(obj.userId) ?? 0;
  const type = toStringOrNull(obj.type);
  const title = toStringOrEmpty(obj.title) || (type ?? "Notification");
  const message = toStringOrEmpty(obj.message);
  const targetId = toNumber(obj.targetId);
  const targetType = toStringOrNull(obj.targetType);
  const read = toBoolean(obj.read ?? obj.isRead);
  const createdAt = toStringOrNull(obj.createdAt ?? obj.created_at);

  return {
    id,
    userId,
    type,
    title,
    message,
    targetId,
    targetType,
    read,
    createdAt,
  };
};

const mapNotificationPage = (value: unknown): NotificationPageResponse => {
  const payload = unwrapEnvelope<Record<string, unknown>>(value);
  const itemsRaw = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.content)
      ? payload.content
      : [];
  const items = itemsRaw
    .map(mapNotificationView)
    .filter((item): item is NotificationView => Boolean(item));

  return {
    items,
    page: toNumber(payload.page) ?? 0,
    size: toNumber(payload.size) ?? items.length,
    totalElements: toNumber(payload.totalElements) ?? items.length,
    totalPages: toNumber(payload.totalPages) ?? 1,
  };
};

export async function listNotifications(options?: {
  unreadOnly?: boolean;
  page?: number;
  size?: number;
}): Promise<NotificationPageResponse> {
  const params = {
    unreadOnly: Boolean(options?.unreadOnly),
    page: options?.page ?? 0,
    size: options?.size ?? 20,
  };
  const response = await apiClient.get(NOTIFICATIONS_PATH, { params });
  return mapNotificationPage(response.data);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get(`${NOTIFICATIONS_PATH}/unread-count`);
  const payload = unwrapEnvelope<Record<string, unknown>>(response.data);
  return toNumber(payload.count) ?? 0;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await apiClient.patch(`${NOTIFICATIONS_PATH}/${notificationId}/read`);
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiClient.patch(`${NOTIFICATIONS_PATH}/read-all`);
  const payload = unwrapEnvelope<Record<string, unknown>>(response.data);
  return toNumber(payload.updated) ?? 0;
}
