import axios, { AxiosError, AxiosInstance } from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Axios instance for API calls
 * Automatically handles JWT tokens and silent refresh on expiry
 */
const api: AxiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token refresh management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (v: string) => void;
  reject: (e: any) => void;
}> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

export function storeTokens(
  access: string,
  refresh: string,
  expiresIn: number
) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  localStorage.setItem("token_expires_at", String(Date.now() + expiresIn * 1000));
  document.cookie = `auth_token=${access}; path=/; max-age=${expiresIn}; samesite=strict`;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token_expires_at");
  document.cookie = "auth_token=; path=/; max-age=0";
}

// Request interceptor - attach token to all requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      let token = localStorage.getItem("access_token");

      // Fallback: read from cookie if localStorage is empty
      if (!token) {
        const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
        token = match ? match[1] : null;
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors and silent refresh
api.interceptors.response.use(
  (response) => {
    // Extend token expiration on successful requests (activity-based timeout)
    if (typeof window !== "undefined") {
      const expiresIn = 86400; // 24 hours
      const currentToken = localStorage.getItem("access_token");
      if (currentToken) {
        const newExpiresAt = Date.now() + expiresIn * 1000;
        localStorage.setItem("token_expires_at", String(newExpiresAt));
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as any;

    // Only attempt refresh on 401 and if not already retried
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // If refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("refresh_token")
          : null;

      if (!refreshToken) {
        console.warn("[api] No refresh token available, clearing auth");
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login?error=session_expired";
        }
        return Promise.reject(error);
      }

      console.log("[api] Attempting to refresh token");
      const { data } = await axios.post(`${apiUrl}/api/auth/refresh`, {
        refresh_token: refreshToken,
      });

      if (data.status === "success") {
        const { access_token, refresh_token: newRefresh, expires_in } =
          data.data;
        console.log("[api] Token refreshed successfully");
        storeTokens(access_token, newRefresh, expires_in);
        processQueue(null, access_token);
        original.headers.Authorization = `Bearer ${access_token}`;
        return api(original);
      } else {
        console.error("[api] Refresh returned non-success status:", data.message);
        throw new Error(data.message || "Refresh failed");
      }
    } catch (refreshError: any) {
      console.error("[api] Token refresh failed:", refreshError.message || refreshError);
      processQueue(refreshError, null);
      clearAuth();
      if (typeof window !== "undefined") {
        const errorMsg = refreshError?.response?.data?.message || "session_expired";
        window.location.href = `/login?error=${encodeURIComponent(errorMsg)}`;
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
