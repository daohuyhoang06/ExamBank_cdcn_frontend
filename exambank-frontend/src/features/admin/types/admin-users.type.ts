export type AdminUserRecord = {
  id?: number | string;
  email?: string;
  name?: string;
  primaryRole?: string;
  roles?: string[];
  status?: string;
  createdAt?: string;
};

export type AdminUserRoleCode = "USER" | "MODERATOR" | "ADMIN";
export type AdminUserStatusCode = "ACTIVE" | "INACTIVE" | "BANNED";

export type AdminCreateUserPayload = {
  email: string;
  name: string;
  password: string;
  roleCode: AdminUserRoleCode;
  status: AdminUserStatusCode;
};

export type AdminUserCardMetrics = {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
};

export type AdminUsersPageCardMetrics = AdminUserCardMetrics & {
  lockedUsers: number;
};
