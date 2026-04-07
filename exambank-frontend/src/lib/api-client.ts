import axios from "axios";

const TOKEN_KEY = "exambank_access_token";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token: string | null) {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  localStorage.setItem(TOKEN_KEY, token);
}

export function initializeAuthToken() {
  const existingToken = localStorage.getItem(TOKEN_KEY);
  if (existingToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
  }
}

initializeAuthToken();

export { TOKEN_KEY };
