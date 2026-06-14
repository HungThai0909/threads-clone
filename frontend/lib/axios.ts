import axios from "axios";
import { API_BASE_URL } from "@/constants";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status !== 401 ||
      original._retry ||
      typeof window === "undefined"
    ) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/register") ||
      original.url?.includes("/auth/refresh-token") ||
      original.url?.includes("/auth/google");
    original.url?.includes("/auth/verify-email");

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;
    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      _redirectToLogin();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const newAccessToken = data?.data?.accessToken;
      const newRefreshToken = data?.data?.refreshToken;

      if (!newAccessToken) throw new Error("No access token in response");

      localStorage.setItem("accessToken", newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem("refreshToken", newRefreshToken);
      }

      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    } catch {
      _redirectToLogin();
      return Promise.reject(error);
    }
  },
);

function _redirectToLogin() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  localStorage.removeItem("auth-storage");

  window.location.replace("/login");
}

export default api;
