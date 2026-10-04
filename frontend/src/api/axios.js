import axios from "axios";

// Normalize base URL to ensure no trailing slash
const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl && import.meta.env.DEV) {
  console.warn("VITE_API_URL is not configured.");
}

export const API_BASE_URL = (rawApiUrl || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to catch expired JWT sessions globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Session expired or invalid
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes("/login") ||
        error.config?.url?.includes("/signup") ||
        error.config?.url?.includes("/fetch-user");

      // Only trigger session reset if not on initial auth checks
      if (!isAuthRoute && typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
    }

    return Promise.reject(error);
  },
);

export default api;
