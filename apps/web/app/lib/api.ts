import axios, { AxiosError, AxiosInstance } from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Axios instance for API calls
 * Automatically handles JWT tokens and redirects on auth errors
 */
const api: AxiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

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

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Log 401 errors for debugging
    if (error.response?.status === 401) {
      console.error("[API] 401 Unauthorized", {
        url: error.config?.url,
        response: error.response?.data,
      });
      // Optionally redirect, but for now just reject
      // if (typeof window !== "undefined") {
      //   localStorage.clear();
      //   window.location.href = "/login";
      // }
    }

    return Promise.reject(error);
  }
);

export default api;
