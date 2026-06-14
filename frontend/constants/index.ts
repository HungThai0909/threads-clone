export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export const ROUTES = {
  HOME: "/",
  FEED: "/feed",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  NOTIFICATIONS: "/notifications",
  MESSAGES: "/messages",
  SEARCH: "/search",
  PROFILE: (id: number | string) => `/profile/${id}`,
  POST: (id: number | string) => `/post/${id}`,
  HASHTAG: (name: string) => `/hashtag/${name}`,
} as const;

export const QUERY_KEYS = {
  ME: ["me"],
  FEED: ["feed"],
  POST: (id: number) => ["post", id],
  USER_POSTS: (id: number) => ["user-posts", id],
  USER_PROFILE: (id: number) => ["user-profile", id],
  COMMENTS: (postId: number) => ["comments", postId],
  REPLIES: (commentId: number) => ["replies", commentId],
  NOTIFICATIONS: ["notifications"],
  CONVERSATIONS: ["conversations"],
  MESSAGES: (id: number) => ["messages", id],
  SEARCH_USERS: (q: string) => ["search-users", q],
  SEARCH_POSTS: (q: string) => ["search-posts", q],
  SEARCH_HISTORY: ["search-history"],
  SUGGESTED_USERS: ["suggested-users"],
  TRENDING_HASHTAGS: ["trending-hashtags"],
  HASHTAG_POSTS: (name: string) => ["hashtag-posts", name],
  FOLLOWERS: (id: number) => ["followers", id],
  FOLLOWING: (id: number) => ["following", id],
  UNREAD_MESSAGES: ["unread-messages"],
} as const;
