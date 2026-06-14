import api from "@/lib/axios";
import type {
  ApiResponse,
  Comment,
  Reply,
  Notification,
  Message,
  Conversation,
  Hashtag,
  SearchHistoryItem,
  Post,
} from "@/types";

export const commentService = {
  async getComments(postId: number, cursor?: number, limit = 20) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", String(cursor));
    const res = await api.get<ApiResponse<Comment[]>>(
      `/comments/${postId}/comments?${params}`,
    );
    return res.data;
  },

  getUserComments: async (
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<ApiResponse<Comment[]>> => {
    const response = await api.get(
      `/users/${userId}/comments?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  async createComment(postId: number, content: string) {
    const res = await api.post<ApiResponse<Comment>>(
      `/comments/${postId}/comments`,
      { content },
    );
    return res.data;
  },

  async updateComment(postId: number, commentId: number, content: string) {
    const res = await api.patch<ApiResponse<Comment>>(
      `/comments/${postId}/comments/${commentId}`,
      { content },
    );
    return res.data;
  },

  async deleteComment(postId: number, commentId: number) {
    const res = await api.delete<ApiResponse>(
      `/comments/${postId}/comments/${commentId}`,
    );
    return res.data;
  },

  async likeComment(postId: number, commentId: number) {
    const res = await api.post<ApiResponse>(
      `/comments/${postId}/comments/${commentId}/like`,
    );
    return res.data;
  },

  async unlikeComment(postId: number, commentId: number) {
    const res = await api.delete<ApiResponse>(
      `/comments/${postId}/comments/${commentId}/like`,
    );
    return res.data;
  },

  async getReplies(postId: number, commentId: number, page = 1, limit = 20) {
    const res = await api.get<ApiResponse<Reply[]>>(
      `/comments/${postId}/comments/${commentId}/replies?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  async createReply(postId: number, commentId: number, content: string) {
    const res = await api.post<ApiResponse<Reply>>(
      `/comments/${postId}/comments/${commentId}/replies`,
      { content },
    );
    return res.data;
  },

  async updateReply(
    postId: number,
    commentId: number,
    replyId: number,
    content: string,
  ) {
    const res = await api.patch<ApiResponse<Reply>>(
      `/comments/${postId}/comments/${commentId}/replies/${replyId}`,
      { content },
    );
    return res.data;
  },

  async deleteReply(postId: number, commentId: number, replyId: number) {
    const res = await api.delete<ApiResponse>(
      `/comments/${postId}/comments/${commentId}/replies/${replyId}`,
    );
    return res.data;
  },

  async likeReply(postId: number, commentId: number, replyId: number) {
    const res = await api.post<ApiResponse>(
      `/comments/${postId}/comments/${commentId}/replies/${replyId}/like`,
    );
    return res.data;
  },

  async unlikeReply(postId: number, commentId: number, replyId: number) {
    const res = await api.delete<ApiResponse>(
      `/comments/${postId}/comments/${commentId}/replies/${replyId}/like`,
    );
    return res.data;
  },
};

export const notificationService = {
  async getAll(page = 1, limit = 20) {
    const res = await api.get<
      ApiResponse<{ notifications: Notification[]; unreadCount: number }>
    >(`/notifications?page=${page}&limit=${limit}`);
    return res.data;
  },

  async markRead(id: number) {
    const res = await api.patch<ApiResponse>(`/notifications/${id}`);
    return res.data;
  },

  async markAllRead() {
    const res = await api.patch<ApiResponse>("/notifications");
    return res.data;
  },
};

export const messageService = {
  async getConversations() {
    const res = await api.get<ApiResponse<Conversation[]>>(
      "/messages/conversations",
    );
    return res.data;
  },

  async getOrCreateConversation(data: {
    participantIds: number[];
    name?: string;
    isGroup?: boolean;
  }) {
    const res = await api.post<ApiResponse<Conversation>>(
      "/messages/conversations",
      data,
    );
    return res.data;
  },

  async getMessages(conversationId: number, cursor?: number) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", String(cursor));
    const res = await api.get<ApiResponse<Message[]>>(
      `/messages/conversations/${conversationId}/messages?${params}`,
    );
    return res.data;
  },

  async sendMessage(data: FormData) {
    const res = await api.post<ApiResponse<Message>>(
      "/messages/messages",
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  async markMessageRead(messageId: number) {
    const res = await api.put<ApiResponse>(
      `/messages/messages/${messageId}/read`,
    );
    return res.data;
  },

  async getUnreadCount() {
    const res = await api.get<ApiResponse<{ unreadCount: number }>>(
      "/messages/unread-count",
    );
    return res.data;
  },
};

export const searchService = {
  async searchUsers(query: string, page = 1, limit = 20) {
    const res = await api.get<ApiResponse>(
      `/search/users?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  async searchPosts(query: string, cursor?: number, limit = 15) {
    const params = new URLSearchParams({ query, limit: String(limit) });
    if (cursor) params.set("cursor", String(cursor));
    const res = await api.get<ApiResponse>(`/search/posts?${params}`);
    return res.data;
  },

  async saveSearchHistory(targetId: number) {
    const res = await api.post<ApiResponse>(`/search/history/${targetId}`);
    return res.data;
  },

  async getSearchHistory(limit = 10) {
    const res = await api.get<ApiResponse<SearchHistoryItem[]>>(
      `/search/history?limit=${limit}`,
    );
    return res.data;
  },

  async deleteSearchHistoryItem(id: number) {
    const res = await api.delete<ApiResponse>(`/search/history/${id}`);
    return res.data;
  },

  async clearSearchHistory() {
    const res = await api.delete<ApiResponse>("/search/history");
    return res.data;
  },
};

export const hashtagService = {
  async getTrending() {
    const res = await api.get<ApiResponse<Hashtag[]>>("/hashtags/trending");
    return res.data;
  },

  async search(query: string) {
    const res = await api.get<ApiResponse<Hashtag[]>>(
      `/hashtags/search?query=${encodeURIComponent(query)}`,
    );
    return res.data;
  },

  async getPostsByHashtag(name: string, cursor?: number, limit = 15) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", String(cursor));

    const res = await api.get<ApiResponse<Post[]>>(
      `/hashtags/${encodeURIComponent(name)}/posts?${params}`,
    );
    return res.data;
  },
};
