export type PremiumUpgradeOrderStatus =
  | "CREATED"
  | "TRANSFER_CONFIRMED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface PremiumPlan {
  id: number;
  code: string;
  name: string;
  durationDays: number;
  price: number;
}

export interface PremiumStatus {
  premium: boolean;
  confirmed: boolean;
  status: string;
  planCode?: string;
  planName?: string;
  startedAt?: string;
  expiresAt?: string;
}

export interface PremiumUpgradeOrder {
  id: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  planCode: string;
  planName: string;
  planDurationDays: number;
  planPrice: number;
  status: PremiumUpgradeOrderStatus;
  qrCodeImageUrl: string;
  transferContent: string;
  transferConfirmedAt?: string;
  billImageUrl?: string;
  billUploadedAt?: string;
  adminNote?: string;
  reviewedByUserId?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
