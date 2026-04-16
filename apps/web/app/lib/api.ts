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
      const token = localStorage.getItem("access_token");
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
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear all stored data
      if (typeof window !== "undefined") {
        localStorage.clear();

        // Redirect to login
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
