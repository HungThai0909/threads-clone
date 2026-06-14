import api from "@/lib/axios";
import type { ApiResponse, Post } from "@/types";

export const postService = {
  async getFeed(page = 1, limit = 20) {
    const res = await api.get<ApiResponse<Post[]>>(
      `/posts/feed?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  async getPost(postId: number) {
    const res = await api.get<ApiResponse<Post>>(`/posts/${postId}`);
    return res.data;
  },

  async getUserPosts(userId: number, page = 1, limit = 20) {
    try {
      const res = await api.get<ApiResponse<Post[]>>(
        `/posts/user/${userId}?page=${page}&limit=${limit}`,
      );
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { success: true, data: [] };
      }
      throw err;
    }
  },

  async createPost(data: FormData) {
    if (!(data instanceof FormData)) {
      throw new Error("Dữ liệu gửi lên bắt buộc phải là định dạng FormData");
    }
    const res = await api.post<ApiResponse<Post>>("/posts", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async updatePost(postId: number, content: string) {
    const res = await api.patch<ApiResponse<Post>>(`/posts/${postId}`, {
      content,
    });
    return res.data;
  },

  async deletePost(postId: number) {
    const res = await api.delete<ApiResponse>(`/posts/${postId}`);
    return res.data;
  },

  async likePost(postId: number) {
    const res = await api.post<ApiResponse>(`/posts/${postId}/like`);
    return res.data;
  },

  async getLikedPosts(userId: number, page: number = 1, limit: number = 20) {
    try {
      const res = await api.get<ApiResponse<Post[]>>(
        `/posts/user/${userId}/liked`,
        {
          params: { page, limit },
        },
      );
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { success: true, data: [] };
      }
      throw err;
    }
  },

  async unlikePost(postId: number) {
    const res = await api.delete<ApiResponse>(`/posts/${postId}/like`);
    return res.data;
  },

  async replyPost(postId: number, data: FormData) {
    const res = await api.post<ApiResponse<Post>>(
      `/posts/${postId}/reply`,
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  async quotePost(postId: number, data: FormData) {
    const res = await api.post<ApiResponse<Post>>(
      `/posts/${postId}/quote`,
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  async repost(postId: number) {
    const res = await api.post<ApiResponse>(`/posts/${postId}/repost`);
    return res.data;
  },

  async removeRepost(postId: number) {
    const res = await api.delete<ApiResponse>(`/posts/${postId}/repost`);
    return res.data;
  },
  async getPostsByHashtag(hashtag: string, page = 1, limit = 20) {
    try {
      const res = await api.get<ApiResponse<Post[]>>(`/posts`, {
        params: { hashtag, page, limit },
      });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { success: true, data: [] };
      }
      throw err;
    }
  },
};
