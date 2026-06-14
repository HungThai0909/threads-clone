"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { ArrowLeft, Settings, MessageSquare, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostCard } from "@/components/post/post-card";
import { PostListSkeleton } from "@/components/post/post-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { EditProfileDialog } from "@/components/user/edit-profile-dialog";
import { ChangePasswordDialog } from "@/components/user/change-password-dialog";
import { FollowListModal } from "@/components/user/follow-list-modal";
import { userService } from "@/services/user.service";
import { postService } from "@/services/post.service";
import { commentService } from "@/services/index";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS, API_BASE_URL } from "@/constants";
import type { Post, Comment } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [editOpen, setEditOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [followModal, setFollowModal] = useState<{
    open: boolean;
    type: "followers" | "following";
  }>({
    open: false,
    type: "followers",
  });
  const [followLoading, setFollowLoading] = useState(false);

  const userId = parseInt(id, 10);
  const isOwn = currentUser?.id === userId;

  // Xác định xem tài khoản hiện tại có phải đăng nhập từ Google hay không
  const isGoogleAccount = 
    currentUser?.provider === "google" || 
    currentUser?.avatarUrl?.includes("googleusercontent.com");

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE(userId),
    queryFn: () => userService.getProfile(userId),
    enabled: !!userId,
  });

  const profile = profileData?.data;

  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasNextPosts,
    isFetchingNextPage: isFetchingNextPosts,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.USER_POSTS(userId),
    queryFn: ({ pageParam = 1 }) =>
      postService.getUserPosts(userId, pageParam as number, 20),
    getNextPageParam: (last, pages) => {
      const posts = last.data ?? [];
      return posts.length === 20 ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
  });

  const allPosts = postsData?.pages.flatMap((p) => p.data ?? []) ?? [];

  const {
    data: likedPostsData,
    isLoading: likedPostsLoading,
    fetchNextPage: fetchNextLikedPosts,
    hasNextPage: hasNextLikedPosts,
    isFetchingNextPage: isFetchingNextLikedPosts,
  } = useInfiniteQuery({
    queryKey: ["USER_LIKED_POSTS", userId],
    queryFn: ({ pageParam = 1 }) => {
      return postService.getLikedPosts(userId, pageParam as number, 20);
    },
    getNextPageParam: (last, pages) => {
      const posts = last?.data ?? [];
      return posts.length === 20 ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
  });

  const allLikedPosts =
    likedPostsData?.pages.flatMap((p) => p.data ?? []) ?? [];

  const handleFollow = async () => {
    if (!profile || !currentUser?.id) return;
    setFollowLoading(true);
    const currentStatus = profile.isFollowing;

    try {
      if (currentStatus) {
        await userService.unfollow(userId);
        toast.success(`Đã hủy theo dõi @${profile.username}`);
      } else {
        await userService.follow(userId);
        toast.success(`Đang theo dõi @${profile.username}`);
      }

      queryClient.setQueryData(
        QUERY_KEYS.USER_PROFILE(userId),
        (oldData: any) => {
          if (!oldData || !oldData.data) return oldData;
          const currentFollowersCount = oldData.data._count?.followers ?? 0;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              isFollowing: !currentStatus,
              _count: {
                ...oldData.data._count,
                followers: Math.max(
                  0,
                  currentFollowersCount + (currentStatus ? -1 : 1),
                ),
              },
            },
          };
        },
      );

      queryClient.setQueryData(
        QUERY_KEYS.USER_PROFILE(currentUser.id),
        (oldData: any) => {
          if (!oldData || !oldData.data) return oldData;
          const currentFollowingCount = oldData.data._count?.following ?? 0;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              _count: {
                ...oldData.data._count,
                following: Math.max(
                  0,
                  currentFollowingCount + (currentStatus ? -1 : 1),
                ),
              },
            },
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: ["followers", userId] });
      queryClient.invalidateQueries({ queryKey: ["following", userId] });
      queryClient.invalidateQueries({
        queryKey: ["followers", currentUser.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["following", currentUser.id],
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Thao tác cập nhật theo dõi thất bại",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const getCoverUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  };

  if (profileLoading) {
    return (
      <div className="pt-4">
        <div className="px-4 mb-4">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={22} />
          </button>
        </div>
        <div className="space-y-3 px-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="skeleton h-5 w-32 rounded bg-muted" />
              <div className="skeleton h-4 w-24 rounded bg-muted" />
            </div>
            <div className="skeleton h-16 w-16 rounded-full bg-muted" />
          </div>
          <div className="skeleton h-4 w-48 rounded bg-muted" />
          <div className="skeleton h-4 w-36 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>User not found.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-foreground mt-2 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      <div className="relative h-32 bg-muted overflow-hidden">
        {profile.coverUrl ? (
          <img
            src={getCoverUrl(profile.coverUrl) ?? ""}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-muted to-secondary" />
        )}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-xl bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-8 mb-3">
          <UserAvatar
            key={profile.avatarUrl || "no-avatar"}
            src={
              profile.avatarUrl
                ? profile.avatarUrl.startsWith("http")
                  ? profile.avatarUrl
                  : `${API_BASE_URL}${profile.avatarUrl}`
                : null
            }
            fallback={profile.username?.charAt(0).toUpperCase() || "?"}
            size="xl"
            className="border-4 border-background ring-0"
          />

          <div className="flex items-center gap-2">
            {isOwn ? (
              <>
                {/* CHỈ hiển thị nút Đổi mật khẩu nếu KHÔNG PHẢI tài khoản đăng nhập bằng Google */}
                {!isGoogleAccount && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground hover:bg-muted font-medium transition-colors"
                    onClick={() => setChangePasswordOpen(true)}
                  >
                    <KeyRound size={14} className="mr-1.5 text-foreground" />{" "}
                    Đổi mật khẩu
                  </Button>
                )}

                {/* Nút Edit Profile: Luôn hiển thị dù đăng nhập bằng hình thức nào */}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-muted font-medium transition-colors"
                  onClick={() => setEditOpen(true)}
                >
                  <Settings size={14} className="mr-1.5 text-foreground" />{" "}
                  Chỉnh sửa hồ sơ
                </Button>
              </>
            ) : (
              <>
                {profile.isFollowing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium border-border hover:bg-muted text-foreground"
                    onClick={() =>
                      router.push(`/messages?userId=${profile.id}`)
                    }
                  >
                    <MessageSquare
                      size={14}
                      className="mr-1.5 text-foreground"
                    />
                    Nhắn tin
                  </Button>
                )}

                <Button
                  variant={profile.isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={cn(
                    "min-w-25 text-xs font-medium transition-colors",
                    profile.isFollowing
                      ? "text-foreground bg-transparent border-border hover:bg-muted"
                      : "bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90",
                  )}
                >
                  {followLoading ? (
                    <Spinner size="sm" />
                  ) : profile.isFollowing ? (
                    "Đang theo dõi"
                  ) : (
                    "Theo dõi"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {profile.fullname}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="text-sm text-foreground/90 leading-relaxed mb-3 whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button
            onClick={() => setFollowModal({ open: true, type: "followers" })}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="font-semibold text-foreground">
              {profile._count?.followers ?? 0}
            </span>{" "}
            followers
          </button>
          <button
            onClick={() => setFollowModal({ open: true, type: "following" })}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="font-semibold text-foreground">
              {profile._count?.following ?? 0}
            </span>{" "}
            following
          </button>
          <span>
            <span className="font-semibold text-foreground">
              {profile._count?.posts ?? 0}
            </span>{" "}
            threads
          </span>
        </div>
      </div>

      <Tabs defaultValue="threads" className="w-full">
        <TabsList className="w-full border-b border-border bg-transparent rounded-none h-auto p-0 gap-6 px-4">
          <TabsTrigger
            value="threads"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-muted-foreground data-[state=active]:text-foreground font-semibold py-3 transition-all"
          >
            Threads
          </TabsTrigger>
          <TabsTrigger
            value="likes"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-muted-foreground data-[state=active]:text-foreground font-semibold py-3 transition-all"
          >
            Likes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="threads" className="mt-0">
          {postsLoading ? (
            <PostListSkeleton count={4} />
          ) : allPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No threads yet.
            </div>
          ) : (
            <>
              {allPosts.map((post: Post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {hasNextPosts && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPosts()}
                    disabled={isFetchingNextPosts}
                    className="text-foreground"
                  >
                    {isFetchingNextPosts ? <Spinner size="sm" /> : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="likes" className="mt-0">
          {likedPostsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : allLikedPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Chưa có bài viết nào được thích.
            </div>
          ) : (
            <div>
              {allLikedPosts.map((post: Post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {hasNextLikedPosts && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextLikedPosts()}
                    disabled={isFetchingNextLikedPosts}
                    className="text-foreground"
                  >
                    {isFetchingNextLikedPosts ? (
                      <Spinner size="sm" />
                    ) : (
                      "Xem thêm"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
      />

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      <FollowListModal
        open={followModal.open}
        type={followModal.type}
        userId={userId}
        onClose={() => setFollowModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}