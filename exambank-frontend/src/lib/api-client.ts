import axios, { AxiosHeaders } from "axios";

const TOKEN_KEY = "exambank_access_token";
const SESSION_TOKEN_KEY = `${TOKEN_KEY}_session`;
const PERSISTENT_TOKEN_KEY = `${TOKEN_KEY}_persistent`;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
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
      config.headers = headers;
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
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    clearStoredAuthToken();
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  storeAuthToken(token, persist);
}

export function initializeAuthToken() {
  const existingToken = getStoredAuthToken();
  if (existingToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
  }
}

initializeAuthToken();

export { TOKEN_KEY };
