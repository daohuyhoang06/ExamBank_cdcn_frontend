import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

const TOKEN_KEY = "exambank_access_token";
const SESSION_TOKEN_KEY = `${TOKEN_KEY}_session`;
const PERSISTENT_TOKEN_KEY = `${TOKEN_KEY}_persistent`;
const AUTH_BYPASS_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/auth/login",
  "/auth/register",
]);
const PUBLIC_GET_WITHOUT_AUTH_PATTERNS = [
  /^\/api\/exams$/,
  /^\/api\/exams\/\d+$/,
  /^\/api\/subjects(?:\/.*)?$/,
  /^\/api\/topics(?:\/.*)?$/,
  /^\/api\/questions(?:\/.*)?$/,
];

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
});

function shouldBypassAuthHeader(url?: string, method?: string) {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url, "http://localhost");
    if ((method ?? "GET").toUpperCase() === "GET") {
      if (PUBLIC_GET_WITHOUT_AUTH_PATTERNS.some((pattern) => pattern.test(parsedUrl.pathname))) {
        return true;
      }
    }
    return AUTH_BYPASS_PATHS.has(parsedUrl.pathname);
  } catch {
    if ((method ?? "GET").toUpperCase() === "GET") {
      const guessedPath = url.split("?")[0];
      if (PUBLIC_GET_WITHOUT_AUTH_PATTERNS.some((pattern) => pattern.test(guessedPath))) {
        return true;
      }
    }
    return Array.from(AUTH_BYPASS_PATHS).some((path) => url.includes(path));
  }
}

function removeAuthorizationHeader(config: InternalAxiosRequestConfig) {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.delete("Authorization");
    return;
  }

  const headers = (config.headers ?? {}) as Record<string, string>;
  delete headers.Authorization;
  delete headers.authorization;
  config.headers = AxiosHeaders.from(headers);
}

apiClient.interceptors.request.use((config) => {
  if (shouldBypassAuthHeader(config.url, config.method)) {
    // Public auth endpoints must never carry stale bearer tokens.
    removeAuthorizationHeader(config);
    return config;
  }

  const token = getStoredAuthToken();

  if (token) {
    if (config.headers instanceof AxiosHeaders) {
      if (!config.headers.has("Authorization")) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    } else {
      const headers = (config.headers ?? {}) as Record<string, string>;
      if (!headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
      config.headers = AxiosHeaders.from(headers);
    }
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      const headers = config.headers as Record<string, unknown>;
      delete headers["Content-Type"];
      delete headers["content-type"];
    }
  }

  return config;

});

function toBearerHeader(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const normalized = token.replace(/^Bearer\s+/i, "").trim();
  if (!normalized) {
    return null;
  }

  return `Bearer ${normalized}`;
}

function clearStoredAuthToken() {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage access issues in restricted browser modes.
  }

  try {
    localStorage.removeItem(PERSISTENT_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage access issues in restricted browser modes.
  }
}

function storeAuthToken(token: string, persist: boolean) {
  // Always keep a tab-scoped token to avoid cross-tab account mixing.
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // Ignore if session storage is unavailable; local fallback handled below.
  }

  if (!persist) {
    return;
  }

  try {
    localStorage.setItem(PERSISTENT_TOKEN_KEY, token);
  } catch {
    // Fallback to legacy key if persistent storage is restricted.
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getStoredAuthToken() {
  try {
    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }
  } catch {
    // Ignore storage access issues in restricted browser modes.
  }

  try {
    const persistentToken = localStorage.getItem(PERSISTENT_TOKEN_KEY);
    if (persistentToken) {
      return persistentToken;
    }

    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null, persist = false) {
  const bearerHeader = toBearerHeader(token);

  if (!bearerHeader) {
    delete apiClient.defaults.headers.common.Authorization;
    clearStoredAuthToken();
    return;
  }

  apiClient.defaults.headers.common.Authorization = bearerHeader;
  storeAuthToken(bearerHeader.replace(/^Bearer\s+/i, ""), persist);
}

export function initializeAuthToken() {
  const existingToken = getStoredAuthToken();
  const bearerHeader = toBearerHeader(existingToken);
  if (bearerHeader) {
    apiClient.defaults.headers.common.Authorization = bearerHeader;
  }
}

initializeAuthToken();

export { TOKEN_KEY };
