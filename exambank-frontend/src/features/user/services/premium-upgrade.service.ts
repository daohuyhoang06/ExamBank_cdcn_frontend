import { apiClient } from "@/lib/api-client";
import type {
  PremiumPlan,
  PremiumStatus,
  PremiumUpgradeOrder,
  PremiumUpgradeOrderStatus,
} from "@/features/user/types/premium-upgrade.type";

const STORAGE_PUBLIC_ENDPOINT = (
  import.meta.env.VITE_STORAGE_PUBLIC_ENDPOINT ??
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_MINIO_PUBLIC_ENDPOINT ??
  ""
).replace(/\/+$/, "");

const toPublicStorageUrl = (fileUrl?: string | null): string | undefined => {
  if (!fileUrl) {
    return undefined;
  }
  const normalized = fileUrl.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  if (normalized.startsWith("/")) {
    return normalized;
  }
  if (!normalized.startsWith("storage://")) {
    return `${STORAGE_PUBLIC_ENDPOINT}/${normalized.replace(/^\/+/, "")}`;
  }
  const pathWithoutScheme = normalized.slice("storage://".length);
  const firstSlash = pathWithoutScheme.indexOf("/");
  if (firstSlash <= 0) {
    return undefined;
  }
  const bucket = pathWithoutScheme.slice(0, firstSlash);
  const objectKey = pathWithoutScheme.slice(firstSlash + 1);
  return `${STORAGE_PUBLIC_ENDPOINT}/api/v1/storage/${encodeURIComponent(bucket)}?key=${encodeURIComponent(objectKey)}`;
};

const toString = (value: unknown): string => (typeof value === "string" ? value : "");

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

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

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
};

const mapStatus = (value: unknown): PremiumUpgradeOrderStatus => {
  const normalized = toString(value).trim().toUpperCase();
  if (
    normalized === "CREATED" ||
    normalized === "TRANSFER_CONFIRMED" ||
    normalized === "PENDING_REVIEW" ||
    normalized === "APPROVED" ||
    normalized === "REJECTED"
  ) {
    return normalized;
  }
  return "CREATED";
};

const mapPlan = (value: unknown): PremiumPlan => {
  const obj = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    id: toNumber(obj.id),
    code: toString(obj.code),
    name: toString(obj.name),
    durationDays: toNumber(obj.durationDays),
    price: toNumber(obj.price),
  };
};

const mapOrder = (value: unknown): PremiumUpgradeOrder => {
  const obj = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    id: toNumber(obj.id),
    userId: obj.userId === undefined ? undefined : toNumber(obj.userId),
    userName: toOptionalString(obj.userName),
    userEmail: toOptionalString(obj.userEmail),
    planCode: toString(obj.planCode),
    planName: toString(obj.planName),
    planDurationDays: toNumber(obj.planDurationDays),
    planPrice: toNumber(obj.planPrice),
    status: mapStatus(obj.status),
    qrCodeImageUrl: toString(obj.qrCodeImageUrl),
    transferContent: toString(obj.transferContent),
    transferConfirmedAt: toOptionalString(obj.transferConfirmedAt),
    billImageUrl: toPublicStorageUrl(toOptionalString(obj.billImageUrl)),
    billUploadedAt: toOptionalString(obj.billUploadedAt),
    adminNote: toOptionalString(obj.adminNote),
    reviewedByUserId: obj.reviewedByUserId === undefined ? undefined : toNumber(obj.reviewedByUserId),
    reviewedByName: toOptionalString(obj.reviewedByName),
    reviewedAt: toOptionalString(obj.reviewedAt),
    createdAt: toOptionalString(obj.createdAt),
    updatedAt: toOptionalString(obj.updatedAt),
  };
};

const mapStatusPayload = (value: unknown): PremiumStatus => {
  const obj = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    premium: toBoolean(obj.premium),
    confirmed: toBoolean(obj.confirmed),
    status: toString(obj.status),
    planCode: toOptionalString(obj.planCode),
    planName: toOptionalString(obj.planName),
    startedAt: toOptionalString(obj.startedAt),
    expiresAt: toOptionalString(obj.expiresAt),
  };
};

const toList = <T>(value: unknown, mapper: (item: unknown) => T): T[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(mapper);
};

export const premiumUpgradeService = {
  getPlans: async (): Promise<PremiumPlan[]> => {
    const { data } = await apiClient.get("/api/v1/premium/plans");
    return toList(data, mapPlan);
  },

  getStatus: async (): Promise<PremiumStatus> => {
    const { data } = await apiClient.get("/api/v1/me/premium/status");
    return mapStatusPayload(data);
  },

  getMyLatestOrder: async (): Promise<PremiumUpgradeOrder | null> => {
    const { data } = await apiClient.get("/api/v1/premium/orders/me/latest", {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
    });
    if (!data || typeof data !== "object") {
      return null;
    }
    const mapped = mapOrder(data);
    return mapped.id > 0 ? mapped : null;
  },

  createOrder: async (planCode: string): Promise<PremiumUpgradeOrder> => {
    const { data } = await apiClient.post("/api/v1/premium/orders", { planCode });
    return mapOrder(data);
  },

  confirmTransfer: async (orderId: number): Promise<PremiumUpgradeOrder> => {
    const { data } = await apiClient.post(`/api/v1/premium/orders/${orderId}/confirm-transfer`);
    return mapOrder(data);
  },

  uploadBill: async (orderId: number, file: File): Promise<PremiumUpgradeOrder> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post(`/api/v1/premium/orders/${orderId}/bill`, formData);
    return mapOrder(data);
  },
};
