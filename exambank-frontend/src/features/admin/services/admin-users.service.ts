import { apiClient, getStoredAuthToken } from "@/lib/api-client";
import { isAxiosError } from "axios";
import type {
  AdminCreateUserPayload,
  AdminUserCardMetrics,
  AdminUsersPageCardMetrics,
  AdminUserRecord,
  AdminUpdateUserPayload,
} from "@/features/admin/types/admin-users.type";

const PRIMARY_USERS_PATH = "/api/v1/users";
const FALLBACK_USERS_PATH = "/v1/users";

type UserListEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
  items?: unknown;
  users?: unknown;
};

function extractUsers(payload: unknown): AdminUserRecord[] {
  if (Array.isArray(payload)) {
    return payload as AdminUserRecord[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const wrapped = payload as UserListEnvelope;
  const candidates = [
    wrapped.data,
    wrapped.result,
    wrapped.payload,
    wrapped.content,
    wrapped.items,
    wrapped.users,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as AdminUserRecord[];
    }

    if (candidate && typeof candidate === "object") {
      const nested = extractUsers(candidate);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

async function getUsersResponse() {
  const token = getStoredAuthToken();
  const requestConfig = {
    params: {
      t: Date.now(),
    },
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  };

  try {
    return await apiClient.get(PRIMARY_USERS_PATH, requestConfig);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return apiClient.get(FALLBACK_USERS_PATH, requestConfig);
    }

    throw error;
  }
}

async function createUserResponse(payload: AdminCreateUserPayload) {
  const token = getStoredAuthToken();
  const requestConfig = {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  };

  const requestBody = {
    email: payload.email,
    name: payload.name,
    password: payload.password,
    roles: [payload.roleCode],
    status: payload.status,
    xp: 0,
    coinBalance: 0,
    streak: 0,
  };

  try {
    return await apiClient.post(PRIMARY_USERS_PATH, requestBody, requestConfig);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return apiClient.post(FALLBACK_USERS_PATH, requestBody, requestConfig);
    }

    throw error;
  }
}

async function updateUserResponse(userId: number | string, payload: AdminUpdateUserPayload) {
  const token = getStoredAuthToken();
  const requestConfig = {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  };

  const requestBody: {
    email: string;
    name: string;
    password?: string;
    role: string;
    status: string;
    xp: number;
    coinBalance: number;
    streak: number;
  } = {
    email: payload.email,
    name: payload.name,
    role: payload.roleCode,
    status: payload.status,
    xp: 0,
    coinBalance: 0,
    streak: 0,
  };

  if (payload.password && payload.password.trim()) {
    requestBody.password = payload.password;
  }

  try {
    return await apiClient.put(`${PRIMARY_USERS_PATH}/${userId}`, requestBody, requestConfig);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return apiClient.put(`${FALLBACK_USERS_PATH}/${userId}`, requestBody, requestConfig);
    }

    throw error;
  }
}

async function deleteUserResponse(userId: number | string) {
  const token = getStoredAuthToken();
  const requestConfig = {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  };

  try {
    return await apiClient.delete(`${PRIMARY_USERS_PATH}/${userId}`, requestConfig);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return apiClient.delete(`${FALLBACK_USERS_PATH}/${userId}`, requestConfig);
    }

    throw error;
  }
}

async function assignRoleResponse(userId: number | string, roleCode: string) {
  const token = getStoredAuthToken();
  const requestConfig = {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  };

  const requestBody = {
    roleCode: roleCode,
  };

  return await apiClient.post(
    `/api/v1/admin/users/${userId}/roles`,
    requestBody,
    requestConfig
  );
}

async function removeRoleResponse(userId: number | string, roleCode: string) {
  const token = getStoredAuthToken();
  const requestConfig = {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  };

  return await apiClient.delete(
    `/api/v1/admin/users/${userId}/roles/${roleCode}`,
    requestConfig
  );
}

function isSameDay(input: Date, ref: Date) {
  return (
    input.getFullYear() === ref.getFullYear() &&
    input.getMonth() === ref.getMonth() &&
    input.getDate() === ref.getDate()
  );
}

function isLockedStatus(status?: string) {
  const normalized = (status ?? "").toUpperCase();
  return normalized === "BANNED" || normalized === "LOCKED";
}

function getTodayNewUsers(users: AdminUserRecord[], today: Date) {
  return users.filter((user) => {
    if (!user.createdAt) {
      return false;
    }

    const createdAtDate = new Date(user.createdAt);
    return !Number.isNaN(createdAtDate.getTime()) && isSameDay(createdAtDate, today);
  }).length;
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  const response = await getUsersResponse();
  return extractUsers(response.data);
}

export async function createAdminUser(payload: AdminCreateUserPayload): Promise<AdminUserRecord> {
  const normalizedPayload: AdminCreateUserPayload = {
    ...payload,
    email: payload.email.trim().toLowerCase(),
    name: payload.name.trim(),
    password: payload.password.trim(),
  };

  const response = await createUserResponse(normalizedPayload);
  return response.data as AdminUserRecord;
}

export async function getAdminUsersPageCardMetrics(): Promise<AdminUsersPageCardMetrics> {
  const users = await getAdminUsers();
  const today = new Date();

  const totalUsers = users.length;
  const activeUsers = users.filter(
    (user) => (user.status ?? "").toUpperCase() === "ACTIVE"
  ).length;
  const newUsersToday = getTodayNewUsers(users, today);
  const lockedUsers = users.filter((user) => isLockedStatus(user.status)).length;

  return {
    totalUsers,
    activeUsers,
    newUsersToday,
    lockedUsers,
  };
}

export async function getAdminUserCardMetrics(): Promise<AdminUserCardMetrics> {
  const metrics = await getAdminUsersPageCardMetrics();

  return {
    totalUsers: metrics.totalUsers,
    activeUsers: metrics.activeUsers,
    newUsersToday: metrics.newUsersToday,
  };
}

export async function updateAdminUser(
  userId: number | string,
  payload: AdminUpdateUserPayload
): Promise<AdminUserRecord> {
  const normalizedPayload: AdminUpdateUserPayload = {
    ...payload,
    email: payload.email.trim().toLowerCase(),
    name: payload.name.trim(),
    password: payload.password?.trim(),
  };

  const response = await updateUserResponse(userId, normalizedPayload);
  return response.data as AdminUserRecord;
}

export async function deleteAdminUser(userId: number | string): Promise<void> {
  await deleteUserResponse(userId);
}

export async function assignRoleToUser(
  userId: number | string,
  roleCode: string
): Promise<AdminUserRecord> {
  const response = await assignRoleResponse(userId, roleCode);
  return response.data as AdminUserRecord;
}

export async function removeRoleFromUser(
  userId: number | string,
  roleCode: string
): Promise<AdminUserRecord> {
  const response = await removeRoleResponse(userId, roleCode);
  return response.data as AdminUserRecord;
}
