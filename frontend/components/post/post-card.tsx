"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Repeat2,
  MoreHorizontal,
  Quote,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { postService } from "@/services/post.service";
import { UserAvatar } from "@/components/user/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { API_BASE_URL, QUERY_KEYS } from "@/constants";
import type { Post } from "@/types";
import { vi } from "date-fns/locale";

interface PostCardProps {
  post: Post;
  onLikeToggle?: (postId: number, liked: boolean) => void;
  onDelete?: (postId: number) => void;
  onCommentClick?: () => void;
  onQuoteClick?: (post: Post) => void;
  showThread?: boolean;
  isDetail?: boolean;
}

export function PostCard({
  post: initialPost,
  onLikeToggle,
  onDelete,
  onCommentClick,
  onQuoteClick,
  showThread = false,
  isDetail = false,
}: PostCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, _hasHydrated } = useAuthStore();

  const isOwner =
    _hasHydrated && user && String(initialPost.author?.id) === String(user.id);

  const author = isOwner
    ? { ...initialPost.author, ...user }
    : initialPost.author || {
        id: 0,
        username: "Người dùng hệ thống",
        avatarUrl: "",
      };

  const post = {
    ...initialPost,
    author: author as any,
  };

  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    setLiked(post.isLiked ?? false);
    setLikeCount(post.likesCount);
  }, [post.isLiked, post.likesCount]);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content ?? "");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!_hasHydrated) return null;

  const getImageUrl = (url: string) =>
    url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  let timeAgo = "Vừa xong";
  if (post?.createdAt) {
    const parsedDate = new Date(post.createdAt);
    if (!isNaN(parsedDate.getTime())) {
      timeAgo = formatDistanceToNow(parsedDate, {
        addSuffix: true,
        locale: vi,
      });
    }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likeLoading) return;
    setLikeLoading(true);

    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevLiked ? prevCount - 1 : prevCount + 1);

    setLiked(nextLiked);
    setLikeCount(nextCount);

    const updateCache = (oldData: any) => {
      if (!oldData) return oldData;
      const target = oldData.data ?? oldData;
      return {
        ...oldData,
        data: {
          ...target,
          isLiked: nextLiked,
          likesCount: nextCount,
        },
      };
    };

    queryClient.setQueryData(QUERY_KEYS.POST(post.id), updateCache);

    queryClient.setQueryData<any>(QUERY_KEYS.FEED, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: (page.data ?? []).map((p: Post) =>
            p.id === post.id
              ? { ...p, isLiked: nextLiked, likesCount: nextCount }
              : p,
          ),
        })),
      };
    });

    if (user?.id) {
      queryClient.setQueryData<any>(
        ["USER_LIKED_POSTS", user.id],
        (old: any) => {
          if (!old?.pages) return old;

          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => {
              let updatedData = page.data ?? [];

              if (nextLiked) {
                const isExist = updatedData.some((p: Post) => p.id === post.id);
                if (!isExist && index === 0) {
                  const newLikedPost = {
                    ...post,
                    isLiked: true,
                    likesCount: nextCount,
                  };
                  updatedData = [newLikedPost, ...updatedData];
                }
              } else {
                updatedData = updatedData.filter((p: Post) => p.id !== post.id);
              }

              return { ...page, data: updatedData };
            }),
          };
        },
      );
    }
    setLikeLoading(false);
  };

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditContent(post.content ?? "");
    setIsEditing(true);
  };

  const handleEditCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleEditSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editContent.trim()) {
      toast.error("Nội dung không được để trống");
      return;
    }
    if (editContent.trim() === post.content) {
      setIsEditing(false);
      return;
    }
    setEditLoading(true);
    try {
      await postService.updatePost(post.id, editContent.trim());
      toast.success("Đã cập nhật bài viết");

      const updatedAuthor = user ? { ...post.author, ...user } : post.author;

      queryClient.setQueryData(QUERY_KEYS.FEED, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: (page.data ?? []).map((p: Post) =>
              p.id === post.id
                ? { ...p, content: editContent.trim(), author: updatedAuthor }
                : p,
            ),
          })),
        };
      });

      queryClient.setQueryData(QUERY_KEYS.POST(post.id), (old: any) => {
        if (!old)
          return {
            data: {
              ...post,
              content: editContent.trim(),
              author: updatedAuthor,
            },
          };
        const oldData = old.data ?? old;
        return {
          ...old,
          data: {
            ...oldData,
            content: editContent.trim(),
            author: updatedAuthor,
          },
        };
      });

      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteLoading(true);
    try {
      await postService.deletePost(post.id);
      toast.success("Đã xóa bài viết");

      queryClient.setQueryData(QUERY_KEYS.FEED, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: (page.data ?? []).filter((p: Post) => p.id !== post.id),
          })),
        };
      });

      onDelete?.(post.id);
      setConfirmDelete(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xóa bài viết thất bại");
    } finally {
      setDeleteLoading(false);
    }
  };

  const authorFallback =
    post.author?.username?.charAt(0).toUpperCase() ??
    post.author?.fullname?.charAt(0).toUpperCase() ??
    "U";

  const quoteAuthorFallback =
    post.quotePost?.author?.username?.charAt(0).toUpperCase() ??
    post.quotePost?.author?.fullname?.charAt(0).toUpperCase() ??
    "U";

  return (
    <article
      className={cn(
        "flex gap-3 py-4 px-4 transition-colors relative animate-fade-in border-b border-border",
        !isDetail && !isEditing && "cursor-pointer hover:bg-muted/30",
        isEditing && "bg-muted/40",
      )}
      onClick={() => !isDetail && !isEditing && router.push(`/post/${post.id}`)}
    >
      <div className="flex flex-col items-center shrink-0">
        <Link
          href={`/profile/${post.author?.id || 0}`}
          onClick={(e) => e.stopPropagation()}
        >
          <UserAvatar
            src={post.author?.avatarUrl}
            fallback={authorFallback}
            size="md"
          />
        </Link>
        {showThread && <div className="w-0.5 bg-border flex-1 mt-2 min-h-6" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href={`/profile/${post.author?.id || 0}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-foreground text-sm hover:underline truncate"
            >
              {post.author?.username || "Người dùng ẩn danh"}
            </Link>
            {post.author?.isVerified && (
              <span className="text-blue-400 shrink-0">
                <svg
                  viewBox="0 0 20 20"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            {post.type === "repost" && (
              <span className="text-xs text-muted-foreground font-normal italic ml-1">
                đã chia sẻ lại
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {isOwner && !isEditing && !confirmDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditStart}>
                    <Pencil size={14} /> Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
                  >
                    <Trash2 size={14} /> Xóa bài viết
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {confirmDelete && (
          <div
            className="flex items-center justify-between bg-muted border border-red-500/30 rounded-xl px-3 py-2.5 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-foreground">Xóa bài viết này?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteCancel}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
              >
                Huỷ
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-400/10 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {deleteLoading ? <Spinner size="sm" /> : "Xóa"}
              </button>
            </div>
          </div>
        )}

        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={500}
              autoFocus
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-border leading-relaxed mb-2"
              rows={Math.max(2, editContent.split("\n").length)}
            />
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs",
                  editContent.length > 480
                    ? "text-red-400"
                    : "text-muted-foreground",
                )}
              >
                {500 - editContent.length} ký tự
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditCancel}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <X size={13} /> Huỷ
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editLoading || !editContent.trim()}
                  className="flex items-center gap-1 text-xs font-semibold text-background bg-foreground hover:opacity-90 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Check size={13} /> Lưu
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          post.content && (
            <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap wrap-break-word mb-2">
              {post.content.split(/(#[a-zA-Z0-9_À-ỹ]+)/g).map((part, i) => {
                if (part.startsWith("#")) {
                  const cleanTag = part.slice(1).toLowerCase().trim();

                  return (
                    <Link
                      key={i}
                      href={`/hashtag/${encodeURIComponent(cleanTag)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      {part}
                    </Link>
                  );
                }
                return part;
              })}
            </div>
          )
        )}

        {!isEditing && post.images && post.images.length > 0 && (
          <div
            className={cn(
              "grid gap-2 mb-3 rounded-xl overflow-hidden",
              post.images.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {post.images.map((img) => (
              <img
                key={img.id}
                src={getImageUrl(img.imageUrl)}
                alt="Ảnh"
                className="w-full object-cover rounded-xl max-h-80"
                onClick={(e) => e.stopPropagation()}
              />
            ))}
          </div>
        )}

        {!isEditing && post.quotePost && (
          <div
            className="border border-border rounded-xl p-3 mb-3 bg-muted/40 hover:bg-muted/80 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/post/${post.quotePost!.id}`);
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <UserAvatar
                src={post.quotePost.author?.avatarUrl}
                fallback={quoteAuthorFallback}
                size="xs"
              />
              <span className="text-xs font-semibold text-foreground">
                {post.quotePost.author?.username || "Người dùng ẩn danh"}
              </span>
            </div>
            {post.quotePost.content && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {post.quotePost.content}
              </p>
            )}

            {post.quotePost.images && post.quotePost.images.length > 0 && (
              <div
                className={cn(
                  "grid gap-1.5 mt-2 rounded-lg overflow-hidden",
                  post.quotePost.images.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-2",
                )}
              >
                {post.quotePost.images.map((img) => (
                  <img
                    key={img.id}
                    src={getImageUrl(img.imageUrl)}
                    alt="Ảnh bài gốc"
                    className="w-full object-cover rounded-lg max-h-48"
                    onClick={(e) => e.stopPropagation()}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!isEditing && !confirmDelete && (
          <div className="flex items-center gap-1 -ml-1.5 mt-1">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer",
                liked
                  ? "text-red-500 hover:bg-red-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Heart
                size={18}
                strokeWidth={2}
                fill={liked ? "currentColor" : "none"}
                className={cn(
                  "transition-transform",
                  likeLoading && "scale-125",
                )}
              />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isDetail) router.push(`/post/${post.id}`);
                else onCommentClick?.();
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <MessageCircle size={18} strokeWidth={2} />
              {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
            </button>

            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const response = await postService.repost(post.id);
                  toast.success("Đã chia sẻ bài viết!");

                  queryClient.setQueryData(
                    QUERY_KEYS.POST(post.id),
                    (oldData: any) => {
                      if (!oldData) return oldData;
                      const target = oldData.data ?? oldData;
                      return {
                        ...oldData,
                        data: {
                          ...target,
                          repostsCount: (target.repostsCount || 0) + 1,
                        },
                      };
                    },
                  );

                  queryClient.setQueryData(QUERY_KEYS.FEED, (old: any) => {
                    if (!old?.pages) return old;

                    const newRepostPost = (response?.data || {
                      id: Date.now(),
                      content: "",
                      type: "repost",
                      visibility: "public",
                      createdAt: new Date().toISOString(),
                      likesCount: 0,
                      commentsCount: 0,
                      repostsCount: 0,
                      isLiked: false,
                      author: user,
                      quotePost: { ...post },
                    }) as Post;

                    return {
                      ...old,
                      pages: old.pages.map((page: any, index: number) => {
                        let updatedData = (page.data ?? []).map((p: Post) =>
                          p.id === post.id
                            ? { ...p, repostsCount: (p.repostsCount || 0) + 1 }
                            : p,
                        );

                        if (index === 0) {
                          updatedData = [newRepostPost, ...updatedData];
                        }

                        return { ...page, data: updatedData };
                      }),
                    };
                  });
                } catch (err: any) {
                  toast.error(
                    err?.response?.data?.message || "Chia sẻ thất bại",
                  );
                }
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Repeat2 size={18} strokeWidth={2} />
              {post.repostsCount > 0 && <span>{post.repostsCount}</span>}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onQuoteClick) {
                  onQuoteClick(post);
                } else {
                  router.push(`/post/${post.id}?action=quote`);
                }
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Quote size={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
