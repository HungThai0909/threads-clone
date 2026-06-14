"use client";

import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { PenSquare, RefreshCw } from "lucide-react";
import { PostCard } from "@/components/post/post-card";
import { PostListSkeleton } from "@/components/post/post-skeleton";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { UserAvatar } from "@/components/user/user-avatar";
import { postService } from "@/services/post.service";
import { QUERY_KEYS } from "@/constants";
import { Spinner } from "@/components/ui/spinner";
import type { Post } from "@/types";

export default function FeedPage() {
  const { user, _hasHydrated } = useAuthStore();
  const { setCreatePostOpen } = useUIStore();

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.FEED,
    queryFn: ({ pageParam = 1 }) =>
      postService.getFeed(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const posts = (lastPage.data as Post[]) ?? [];
      return posts.length === 20 ? pages.length + 1 : undefined;
    },
    enabled: _hasHydrated,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap((p) => (p.data as Post[]) ?? []) ?? [];

  const userFallback =
    user?.username?.charAt(0).toUpperCase() ??
    user?.fullname?.charAt(0).toUpperCase() ??
    "U";

  return (
    <div className="pt-4">
      {/* Sửa viền border-border và chữ text-foreground */}
      <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Threads</h1>
        {!isLoading && (
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {/* Sửa khối tạo bài viết: bg-muted/30 và màu chữ gợi ý text-muted-foreground */}
      <button
        onClick={() => setCreatePostOpen(true)}
        className="flex items-center gap-3 w-full px-4 py-4 border-b border-border hover:bg-muted/30 transition-colors text-left"
      >
        <UserAvatar src={user?.avatarUrl} fallback={userFallback} size="md" />
        <span className="text-muted-foreground text-sm flex-1">Bạn đang nghĩ gì?</span>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted border border-border rounded-xl px-3 py-1.5 cursor-pointer">
          <PenSquare size={13} /> Đăng
        </div>
      </button>

      {isLoading ? (
        <PostListSkeleton count={6} />
      ) : error ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground text-sm">Không tải được bài viết.</p>
          <button
            onClick={() => refetch()}
            className="text-xs text-foreground underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      ) : allPosts.length === 0 ? (
        <div className="text-center py-20 space-y-2">
          <p className="text-2xl">✍️</p>
          <p className="text-foreground font-medium">Chưa có bài viết nào</p>
        </div>
      ) : (
        <>
          {allPosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}

          <div ref={loadMoreRef} className="flex justify-center py-10">
            {isFetchingNextPage && <Spinner />}
          </div>
        </>
      )}
    </div>
  );
}