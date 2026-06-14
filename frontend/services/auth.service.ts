import api from "@/lib/axios";
import type { ApiResponse, User, UserProfile } from "@/types";

export const authService = {
  async register(data: {
    username: string;
    email: string;
    password: string;
    fullname: string;
  }) {
    const res = await api.post<ApiResponse<User>>("/auth/register", data);
    return res.data;
  },

  async login(email: string, password: string) {
    const res = await api.post<
      ApiResponse<{ user: User; accessToken: string; refreshToken: string }>
    >("/auth/login", { email, password });
    return res.data;
  },

  async loginWithGoogle(data: {
    providerUserId: string;
    email: string;
    fullname: string;
    avatarUrl?: string;
  }) {
    const res = await api.post<
      ApiResponse<{ user: User; accessToken: string; refreshToken: string }>
    >("/auth/google", data);
    return res.data;
  },

  async logout() {
    const res = await api.delete<ApiResponse>("/auth/logout");
    return res.data;
  },

  async refreshToken(refreshToken: string) {
    const res = await api.post<
      ApiResponse<{ accessToken: string; refreshToken: string }>
    >("/auth/refresh-token", { refreshToken });
    return res.data;
  },

  async getMe() {
    const res = await api.get<ApiResponse<UserProfile>>("/auth/me");
    return res.data;
  },

  async verifyEmail(token: string): Promise<ApiResponse<any>> {
    const res = await api.get<ApiResponse<any>>(
      `/auth/verify-email?token=${token}`,
    );
    return res.data;
  },

  async resendVerification(email: string): Promise<ApiResponse<any>> {
    if (!email || email.trim() === "") {
      throw new Error("Địa chỉ email không được để trống.");
    }

    const res = await api.post<ApiResponse<any>>("/auth/resend-verification", {
      email,
    });
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await api.post<ApiResponse>("/auth/forgot-password", { email });
    return res.data;
  },

  async verifyResetToken(token: string) {
    const res = await api.get<ApiResponse<{ token: string }>>(
      `/auth/verify-reset?token=${token}`,
    );
    return res.data;
  },

  async resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ) {
    const res = await api.post<ApiResponse>("/auth/reset-password", {
      token,
      password,
      confirmPassword,
    });
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await api.patch<ApiResponse>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return res.data;
  },
};
