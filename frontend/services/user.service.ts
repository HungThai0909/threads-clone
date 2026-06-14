import api from "@/lib/axios";
import type { ApiResponse, UserProfile, SuggestedUser } from "@/types";

export const userService = {
  async getMyProfile() {
    const res = await api.get<ApiResponse<UserProfile>>("/users/profile");
    return res.data;
  },

  async getProfile(id: number) {
    const res = await api.get<ApiResponse<UserProfile>>(`/users/${id}`);
    return res.data;
  },

  async updateProfile(data: { fullname?: string; bio?: string; username?: string }) {
    const res = await api.patch<ApiResponse<UserProfile>>("/users/profile", data);
    return res.data;
  },

  async uploadAvatar(file: File) {
    const form = new FormData();
    form.append("avatar", file);
    const res = await api.patch<ApiResponse<{ id: number; avatarUrl: string }>>(
      "/users/profile/avatar",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  async deleteAvatar() {
    const res = await api.delete<ApiResponse<UserProfile>>("/users/profile/picture");
    return res.data;
  },

  async uploadCover(file: File) {
    const form = new FormData();
    form.append("cover", file);
    const res = await api.patch<ApiResponse<{ id: number; coverUrl: string }>>(
      "/users/profile/cover",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  async follow(userId: number) {
    const res = await api.post<ApiResponse>(`/users/follow/${userId}/follow`);
    return res.data;
  },

  async unfollow(userId: number) {
    const res = await api.delete<ApiResponse>(`/users/follow/${userId}/follow`);
    return res.data;
  },

  async getFollowers(userId: number, page = 1, limit = 20) {
    const res = await api.get<ApiResponse>(`/users/follow/${userId}/followers?page=${page}&limit=${limit}`);
    return res.data;
  },

  async getFollowing(userId: number, page = 1, limit = 20) {
    const res = await api.get<ApiResponse>(`/users/follow/${userId}/following?page=${page}&limit=${limit}`);
    return res.data;
  },

  async block(userId: number) {
    const res = await api.post<ApiResponse>(`/users/${userId}/block`);
    return res.data;
  },

  async unblock(userId: number) {
    const res = await api.delete<ApiResponse>(`/users/${userId}/block`);
    return res.data;
  },

  async getSuggested(page = 1, limit = 5) {
    const res = await api.get<ApiResponse<SuggestedUser[]>>(
      `/users/suggested?page=${page}&limit=${limit}`
    );
    return res.data;
  },
};