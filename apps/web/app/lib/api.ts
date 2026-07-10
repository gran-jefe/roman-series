import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { firebaseAuth } from "./firebase";

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Axios instance for API calls
 * Attaches the current Firebase ID token to every request; the Firebase SDK
 * refreshes the token internally, so getIdToken() always returns a valid one.
 */
const api: AxiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// middleware.ts can't call the Firebase client SDK (it runs at the edge), so
// this cookie only signals "a user is present" for route protection — it is
// never treated as a credential.
export function setAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "auth_token=1; path=/; max-age=2592000; samesite=strict";
}

export function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "auth_token=; path=/; max-age=0";
}

api.interceptors.request.use(
  async (config) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && config && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true;
      try {
        const freshToken = await firebaseAuth.currentUser?.getIdToken(true);
        if (freshToken) {
          config.headers.Authorization = `Bearer ${freshToken}`;
          return api(config);
        }
      } catch (refreshError) {
        console.error("Failed to force-refresh Firebase ID token:", refreshError);
      }
    }

    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearAuthCookie();
      window.location.href = "/login?error=session_expired";
    }
    return Promise.reject(error);
  }
);

export default api;
