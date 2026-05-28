import { apiClient, setAuthToken } from "@/lib/api-client";
import { isAxiosError } from "axios";
import type {
  AuthSuccess,
  LoginPayload,
  RegisterPayload,
} from "@/features/auth/types/auth.type";

const AUTH_LOGIN_PATH = import.meta.env.VITE_AUTH_LOGIN_PATH ?? "/api/auth/login";
const AUTH_REGISTER_PATH = import.meta.env.VITE_AUTH_REGISTER_PATH ?? "/api/auth/register";
const LEGACY_LOGIN_PATH = "/auth/login";
const LEGACY_REGISTER_PATH = "/auth/register";
const USER_KEY = "exambank_user";
const SESSION_USER_KEY = `${USER_KEY}_session`;
const PERSISTENT_USER_KEY = `${USER_KEY}_persistent`;
export const AUTH_USER_UPDATED_EVENT = "exambank-auth-user-updated";

type ApiAuthResponse = {
  token?: string;
  accessToken?: string;
  jwt?: string;
  refreshToken?: string;
  user?: AuthSuccess["user"];
  message?: string;
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  access_token?: string;
};

function unwrapData<T>(value: unknown): T {
  if (!value || typeof value !== "object") {
    return value as T;
  }

  const wrappers: Array<keyof ApiAuthResponse> = ["data", "result", "payload"];
  for (const key of wrappers) {
    if (key in value) {
      return (value as Record<string, T>)[key];
    }
  }

  return value as T;
}

function normalizeAuthResponse(payload: unknown): AuthSuccess {
  const raw = unwrapData<ApiAuthResponse>(payload);
  const token = raw.token ?? raw.accessToken ?? raw.jwt ?? raw.access_token;
  const rawUser = raw.user as
    | {
        id?: string | number;
        email?: string;
        fullName?: string;
        name?: string;
        role?: string;
        roles?: string[];
        avatarUrl?: string;
        avatar?: string;
        imageUrl?: string;
        photoUrl?: string;
        profileImageUrl?: string;
        coinBalance?: number;
      }
    | undefined;

  return {
    token,
    refreshToken: raw.refreshToken,
    user: rawUser
      ? {
          id: rawUser.id,
          email: rawUser.email,
          role: rawUser.role,
          roles: rawUser.roles,
          avatarUrl: (rawUser as { avatarUrl?: string }).avatarUrl,
          fullName: rawUser.fullName ?? rawUser.name,
          coinBalance: typeof rawUser.coinBalance === "number" ? rawUser.coinBalance : undefined,
        }
      : undefined,
    message: raw.message,
  };
}

async function postWithFallback<TBody>(primaryPath: string, fallbackPath: string, body: TBody) {
  try {
    return await apiClient.post(primaryPath, body);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404 && primaryPath !== fallbackPath) {
      return apiClient.post(fallbackPath, body);
    }
    throw error;
  }
}

function clearStoredAuthUserInternal() {
  try {
    sessionStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // Ignore storage access issues in restricted browser modes.
  }

  try {
    localStorage.removeItem(PERSISTENT_USER_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore storage access issues in restricted browser modes.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
  }
}

function saveUser(user: AuthSuccess["user"], persist: boolean) {
  if (!user) {
    return;
  }

  const serialized = JSON.stringify(user);

  // Always keep user info in tab-scoped session storage first.
  try {
    sessionStorage.setItem(SESSION_USER_KEY, serialized);
  } catch {
    // Ignore if session storage is unavailable; persistent fallback below.
  }

  if (!persist) {
    return;
  }

  try {
    localStorage.setItem(PERSISTENT_USER_KEY, serialized);
  } catch {
    localStorage.setItem(USER_KEY, serialized);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
  }
}

export function getStoredAuthUser(): AuthSuccess["user"] | null {
  const parseUser = (rawUser: string | null) => {
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthSuccess["user"];
    } catch {
      return null;
    }
  };

  try {
    const sessionUser = parseUser(sessionStorage.getItem(SESSION_USER_KEY));
    if (sessionUser) {
      return sessionUser;
    }
  } catch {
    // Ignore storage access issues in restricted browser modes.
  }

  try {
    return (
      parseUser(localStorage.getItem(PERSISTENT_USER_KEY)) ??
      parseUser(localStorage.getItem(USER_KEY))
    );
  } catch {
    return null;
  }
}

export function clearStoredAuthUser() {
  clearStoredAuthUserInternal();
}

export function syncStoredAuthUser(user: AuthSuccess["user"]) {
  if (!user) {
    return;
  }

  const serialized = JSON.stringify(user);
  const hasSessionUser = (() => {
    try {
      return Boolean(sessionStorage.getItem(SESSION_USER_KEY));
    } catch {
      return false;
    }
  })();
  const hasPersistentUser = (() => {
    try {
      return Boolean(localStorage.getItem(PERSISTENT_USER_KEY) || localStorage.getItem(USER_KEY));
    } catch {
      return false;
    }
  })();

  try {
    sessionStorage.setItem(SESSION_USER_KEY, serialized);
  } catch {
    // Ignore storage access issues in restricted browser modes.
  }

  if (hasPersistentUser || (!hasSessionUser && hasPersistentUser)) {
    try {
      localStorage.setItem(PERSISTENT_USER_KEY, serialized);
      localStorage.setItem(USER_KEY, serialized);
    } catch {
      // Ignore storage access issues in restricted browser modes.
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
  }
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSuccess> {
    const response = await postWithFallback(AUTH_LOGIN_PATH, LEGACY_LOGIN_PATH, payload);
    const result = normalizeAuthResponse(response.data);
    const persistSession = Boolean(payload.rememberMe);
    const normalizedToken = result.token?.trim();

    if (!normalizedToken) {
      setAuthToken(null);
      clearStoredAuthUserInternal();
      throw new Error("Dang nhap that bai: phan hoi khong chua access token hop le.");
    }

    setAuthToken(normalizedToken, persistSession);
    saveUser(result.user, persistSession);
    try {
      const { data: profile } = await apiClient.get<{ coinBalance?: number; name?: string; email?: string }>("/api/v1/users/me");
      if (result.user) {
        const refreshedUser: AuthSuccess["user"] = {
          ...result.user,
          fullName: profile?.name ?? result.user.fullName ?? result.user.name,
          email: profile?.email ?? result.user.email,
          coinBalance:
            typeof profile?.coinBalance === "number"
              ? profile.coinBalance
              : result.user.coinBalance,
        };
        saveUser(refreshedUser, persistSession);
      }
    } catch {
      // Keep login success even when profile hydration is unavailable.
    }
    return result;
  },

  async register(payload: RegisterPayload): Promise<AuthSuccess> {
    const normalizedPassword = payload.password.trim();
    if (normalizedPassword.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
    }

    const registerBody = {
      ...payload,
      fullName: payload.fullName.trim(),
      name: payload.fullName,
      password: normalizedPassword,
      confirmPassword: payload.confirmPassword.trim(),
    };
    const response = await postWithFallback(AUTH_REGISTER_PATH, LEGACY_REGISTER_PATH, registerBody);
    return normalizeAuthResponse(response.data);
  },

  logout() {
    setAuthToken(null);
    clearStoredAuthUserInternal();
  },
};

export const authStorageKeys = {
  USER_KEY,
  SESSION_USER_KEY,
  PERSISTENT_USER_KEY,
};
