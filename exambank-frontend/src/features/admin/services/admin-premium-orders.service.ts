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
  return {
    id: toNumber(obj.id),
    userId: obj.userId === undefined ? undefined : toNumber(obj.userId),
    userName: toOptionalString(obj.userName),
    userEmail: toOptionalString(obj.userEmail),
    planCode: toString(obj.planCode),
    planName: toString(obj.planName),
    planDurationDays: toNumber(obj.planDurationDays),
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
