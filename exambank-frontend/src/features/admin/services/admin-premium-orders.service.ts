import type { AdminPremiumOrder } from "@/features/admin/types/admin-premium-order.type";
import { apiClient } from "@/lib/api-client";

type PremiumOrderStatus = "CREATED" | "TRANSFER_CONFIRMED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

const STORAGE_PUBLIC_ENDPOINT = (
  import.meta.env.VITE_STORAGE_PUBLIC_ENDPOINT ??
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_MINIO_PUBLIC_ENDPOINT ??
  ""
).replace(/\/+$/, "");

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toString = (value: unknown): string => (typeof value === "string" ? value : "");

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalDateString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  return undefined;
};

const pickOptionalDateString = (source: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = toOptionalDateString(source[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const toStatus = (value: unknown): PremiumOrderStatus => {
  const status = toString(value).toUpperCase();
  if (
    status === "CREATED" ||
    status === "TRANSFER_CONFIRMED" ||
    status === "PENDING_REVIEW" ||
    status === "APPROVED" ||
    status === "REJECTED"
  ) {
    return status;
  }
  return "CREATED";
};

const toPublicStorageUrl = (fileUrl?: string): string | undefined => {
  if (!fileUrl) {
    return undefined;
  }
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://") || fileUrl.startsWith("/")) {
    return fileUrl;
  }
  if (!fileUrl.startsWith("storage://")) {
    return `${STORAGE_PUBLIC_ENDPOINT}/${fileUrl.replace(/^\/+/, "")}`;
  }
  const raw = fileUrl.slice("storage://".length);
  const firstSlash = raw.indexOf("/");
  if (firstSlash <= 0) {
    return undefined;
  }
  const bucket = raw.slice(0, firstSlash);
  const objectKey = raw.slice(firstSlash + 1);
  return `${STORAGE_PUBLIC_ENDPOINT}/api/v1/storage/${encodeURIComponent(bucket)}?key=${encodeURIComponent(objectKey)}`;
};

const mapOrder = (value: unknown): AdminPremiumOrder => {
  const obj = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const premiumObject = (
    obj.premiumStatus && typeof obj.premiumStatus === "object"
      ? obj.premiumStatus
      : obj.userPremiumStatus && typeof obj.userPremiumStatus === "object"
        ? obj.userPremiumStatus
      : obj.premium && typeof obj.premium === "object"
        ? obj.premium
        : {}
  ) as Record<string, unknown>;

  const startedAt = pickOptionalDateString(obj, [
    "startedAt",
    "started_at",
    "startTime",
    "start_time",
    "startAt",
    "start_at",
    "premiumStartedAt",
    "premium_started_at",
    "premiumStartTime",
    "premium_start_time",
    "activatedAt",
    "activated_at",
    "activeFrom",
    "active_from",
    "start_date",
  ]) ?? pickOptionalDateString(premiumObject, [
    "startedAt",
    "started_at",
    "startTime",
    "start_time",
    "startAt",
    "start_at",
    "premiumStartedAt",
    "premium_started_at",
    "activatedAt",
    "activated_at",
    "activeFrom",
    "active_from",
  ]);

  const expiresAtRaw = pickOptionalDateString(obj, [
    "expiresAt",
    "expires_at",
    "endTime",
    "end_time",
    "endAt",
    "end_at",
    "premiumExpiresAt",
    "premium_expires_at",
    "premiumEndTime",
    "premium_end_time",
    "expiredAt",
    "expired_at",
    "activeUntil",
    "active_until",
    "end_date",
  ]) ?? pickOptionalDateString(premiumObject, [
    "expiresAt",
    "expires_at",
    "endTime",
    "end_time",
    "endAt",
    "end_at",
    "premiumExpiresAt",
    "premium_expires_at",
    "expiredAt",
    "expired_at",
    "activeUntil",
    "active_until",
  ]);

  const planDurationDays = toNumber(obj.planDurationDays);
  const expiresAtFromDuration = (() => {
    if (!startedAt || planDurationDays <= 0) {
      return undefined;
    }
    const startDate = new Date(startedAt);
    if (Number.isNaN(startDate.getTime())) {
      return undefined;
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + planDurationDays);
    return endDate.toISOString();
  })();
  const expiresAt = expiresAtRaw ?? expiresAtFromDuration;

  return {
    id: toNumber(obj.id),
    userId: obj.userId === undefined ? undefined : toNumber(obj.userId),
    userName: toOptionalString(obj.userName),
    userEmail: toOptionalString(obj.userEmail),
    planCode: toString(obj.planCode),
    planName: toString(obj.planName),
    planDurationDays,
    planPrice: toNumber(obj.planPrice),
    status: toStatus(obj.status),
    qrCodeImageUrl: toString(obj.qrCodeImageUrl),
    transferContent: toString(obj.transferContent),
    transferConfirmedAt: toOptionalString(obj.transferConfirmedAt),
    billImageUrl: toPublicStorageUrl(toOptionalString(obj.billImageUrl)),
    billUploadedAt: toOptionalString(obj.billUploadedAt),
    adminNote: toOptionalString(obj.adminNote),
    reviewedByUserId: obj.reviewedByUserId === undefined ? undefined : toNumber(obj.reviewedByUserId),
    reviewedByName: toOptionalString(obj.reviewedByName),
    reviewedAt: toOptionalString(obj.reviewedAt),
    startedAt,
    expiresAt,
    createdAt: toOptionalString(obj.createdAt),
    updatedAt: toOptionalString(obj.updatedAt),
  };
};

export const adminPremiumOrdersService = {
  list: async (status?: PremiumOrderStatus): Promise<AdminPremiumOrder[]> => {
    const { data } = await apiClient.get("/api/v1/admin/premium/orders", {
      params: status ? { status } : undefined,
    });
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(mapOrder);
  },

  approve: async (orderId: number): Promise<AdminPremiumOrder> => {
    const { data } = await apiClient.put(`/api/v1/admin/premium/orders/${orderId}/approve`);
    return mapOrder(data);
  },

  reject: async (orderId: number, note: string): Promise<AdminPremiumOrder> => {
    const { data } = await apiClient.put(`/api/v1/admin/premium/orders/${orderId}/reject`, { note });
    return mapOrder(data);
  },
};
