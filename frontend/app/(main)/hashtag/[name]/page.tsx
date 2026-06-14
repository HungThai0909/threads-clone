"use client";

import { useParams, useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, Hash } from "lucide-react";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { PostCard } from "@/components/post/post-card";
import { PostListSkeleton } from "@/components/post/post-skeleton";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/constants";
import type { Post, ApiResponse } from "@/types";
import api from "@/lib/axios";

export default function HashtagPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { ref, inView } = useInView({ threshold: 0.1 });

  const rawName = Array.isArray(params.name) ? params.name[0] : params.name;
  const decodedName = rawName ? decodeURIComponent(rawName).trim() : "";

  const cleanTagName = decodedName.replace(/#/g, "").toLowerCase();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.HASHTAG_POSTS(cleanTagName),
    queryFn: async ({ pageParam }) => {
      const currentCursor = pageParam ?? undefined;

      try {
        const res = await api.get(`/hashtags/${cleanTagName}/posts`, {
          params: { cursor: currentCursor, requesterId: user?.id, limit: 15 },
        });
        return res.data;
      } catch (err) {
        const res = await api.get("/search/posts", {
          params: {
            query: `#${cleanTagName}`,
            cursor: currentCursor,
            requesterId: user?.id,
            limit: 15,
          },
        });
        return res.data;
      }
    },
    getNextPageParam: (lastPage: any) => {
      if (!lastPage) return undefined;

      let postsArray = [];
      if (Array.isArray(lastPage)) {
        postsArray = lastPage;
      } else if (Array.isArray(lastPage?.data)) {
        postsArray = lastPage.data;
      } else if (lastPage?.data?.data && Array.isArray(lastPage.data.data)) {
        postsArray = lastPage.data.data;
      } else {
        postsArray = lastPage?.posts ?? [];
      }

      if (postsArray.length >= 10) {
        return postsArray[postsArray.length - 1]?.id;
      }
      return undefined;
    },
    initialPageParam: undefined,
    enabled: cleanTagName.length > 0,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts =
    data?.pages.flatMap((page: any) => {
      if (!page) return [];
      if (Array.isArray(page)) return page;
      if (Array.isArray(page?.data)) return page.data;
      if (page?.data?.data && Array.isArray(page.data.data))
        return page.data.data;
      return page?.posts ?? [];
    }) ?? [];

  if (!cleanTagName) {
    return (
      <div className="pt-4 text-center py-16 text-[#777]">
        <p>Hashtag không hợp lệ.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-4 text-center py-16 text-red-400">
        <p>Đã xảy ra lỗi khi tải danh sách bài viết. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex items-center gap-3 px-4 pb-4 border-b border-[#1e1e1e]">
        <button
          onClick={() => router.back()}
          className="text-[#777] hover:text-[#f3f3f3] transition-colors cursor-pointer"
          aria-label="Quay lại"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center">
            <Hash size={18} className="text-[#f3f3f3]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#f3f3f3]">
              #{cleanTagName}
            </h1>
            <p className="text-xs text-[#777]">
              {posts.length > 0
                ? `${posts.length} bài viết hiển thị`
                : "Chưa có bài viết nào"}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <PostListSkeleton count={5} />
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl font-bold text-[#2a2a2a]">#</p>
          <p className="text-[#f3f3f3] font-medium">Chưa có bài viết nào</p>
          <p className="text-[#777] text-sm">
            Hãy là người đầu tiên đăng bài với thẻ #{cleanTagName}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col">
            {posts.map((post: Post, index: number) => {
              const isLastItem = index === posts.length - 1;
              return (
                <div
                  key={`${post.id}-${index}`}
                  ref={isLastItem ? ref : undefined}
                >
                  <PostCard post={post} />
                </div>
              );
            })}
          </div>

          {hasNextPage && (
            <div className="flex justify-center py-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-[#777] hover:text-[#f3f3f3] cursor-pointer"
              >
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" /> <span>Đang tải thêm bài viết...</span>
                  </div>
                ) : (
                  "Tải thêm bài viết"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
