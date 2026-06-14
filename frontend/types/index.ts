// ===== AUTH TYPES =====
export interface User {
  id: number;
  username: string;
  email: string;
  fullname: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isEmailVerified: boolean;
  provider?: "credentials" | "google";
}

export interface UserProfile extends User {
  bio?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  _count: {
    followers: number;
    following: number;
    posts: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

// ===== POST TYPES =====
export type PostVisibility = "public" | "followers" | "private";
export type PostType = "post" | "reply" | "quote" | "repost";

export interface PostImage {
  id: number;
  imageUrl: string;
}

export interface Post {
  id: number;
  content: string | null;
  type: PostType;
  visibility: PostVisibility;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  quotesCount?: number;
  parentId?: number | null;
  quotePostId?: number | null;
  createdAt: string;
  updatedAt: string;
  author: UserMini;
  images: PostImage[];
  quotePost?: Post | null;
  isLiked?: boolean;
}

// ===== USER MINI =====
export interface UserMini {
  id: number;
  username: string;
  fullname: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface SuggestedUser extends UserMini {
  bio?: string | null;
  _count: { followers: number };
}

// ===== COMMENT TYPES =====
export interface Comment {
  id: number;
  content: string;
  likesCount: number;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
  author: UserMini;
  replies?: Reply[];
  isLiked?: boolean;
}

export interface Reply {
  id: number;
  content: string;
  likesCount: number;
  createdAt: string;
  author: UserMini;
  isLiked?: boolean;
}

// ===== NOTIFICATION TYPES =====
export type NotificationType = "follow" | "like" | "comment" | "reply";

export interface Notification {
  id: number;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  sender: UserMini;
  post?: { id: number; content: string | null } | null;
}

// ===== MESSAGE TYPES =====
export interface Message {
  id: number;
  conversationId: number;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  deletedAt?: string | null;
  sender: {
    id: number;
    username: string;
    fullname: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: number;
    content: string | null;
    sender: { id: number; username: string };
  } | null;
  reads: { userId: number; readAt: string }[];
}

export interface Conversation {
  id: number;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  messages: Message[];
}

export interface ConversationMember {
  userId: number;
  role: string;
  joinedAt: string;
  user: {
    id: number;
    username: string;
    fullname: string;
    avatarUrl: string | null;
    isVerified?: boolean;
  };
}

// ===== HASHTAG =====
export interface Hashtag {
  id: number;
  name: string;
  postsCount: number;
}

// ===== API RESPONSE =====
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string> | Array<{ field: string; message: string }>;
}

export interface PaginatedData<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

// ===== SEARCH HISTORY =====
// Backend mới trả về: { id, createdAt, target: { id, username, fullname, avatarUrl, isVerified } }
// Backend cũ (search.service.ts gốc) trả về: { id, searchedAt, user: {...} }
// Hỗ trợ cả hai format
export interface SearchHistoryItem {
  id: number;
  // Backend mới dùng createdAt, backend cũ dùng searchedAt
  createdAt?: string;
  searchedAt?: string;
  // Backend mới dùng target, backend cũ dùng user
  target?: UserMini;
  user?: UserMini;
}

// Helper để lấy user từ history item (hỗ trợ cả hai format backend)
export function getHistoryUser(item: SearchHistoryItem): UserMini | null {
  return item.user ?? item.target ?? null;
}

// Helper để lấy thời gian từ history item
export function getHistoryTime(item: SearchHistoryItem): string {
  return item.searchedAt ?? item.createdAt ?? new Date().toISOString();
}