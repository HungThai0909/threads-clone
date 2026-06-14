"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/constants";
import type { SuggestedUser } from "@/types";

export function SuggestedUsers() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SUGGESTED_USERS,
    queryFn: () => userService.getSuggested(1, 5),
    enabled: _hasHydrated && isAuthenticated,
  });

  const users = (data?.data as SuggestedUser[]) ?? [];

  const updateFollowerCountInCache = (userId: number, increment: number) => {
    queryClient.setQueryData(QUERY_KEYS.SUGGESTED_USERS, (oldData: any) => {
      if (!oldData || !oldData.data) return oldData;

      return {
        ...oldData,
        data: oldData.data.map((user: SuggestedUser) => {
          if (user.id === userId) {
            return {
              ...user,
              _count: {
                ...user._count,

                followers: Math.max(
                  0,
                  (user._count.followers ?? 0) + increment,
                ),
              },
            };
          }
          return user;
        }),
      };
    });
  };

  const handleFollow = async (userId: number) => {
    setLoadingIds((prev) => new Set(prev).add(userId));
    const isFollowing = followingIds.has(userId);

    try {
      if (isFollowing) {
        await userService.unfollow(userId);

        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });

        updateFollowerCountInCache(userId, -1);
      } else {
        await userService.follow(userId);

        setFollowingIds((prev) => new Set(prev).add(userId));

        updateFollowerCountInCache(userId, 1);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (!_hasHydrated || isLoading || users.length === 0) return null;

  return (
    <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[#f3f3f3]">Gợi ý cho bạn</h3>
      <div className="space-y-3">
        {users.map((u: SuggestedUser) => (
          <div key={u.id} className="flex items-center gap-3">
            <button onClick={() => router.push(`/profile/${u.id}`)}>
              <UserAvatar src={u.avatarUrl} fallback={u.username} size="sm" />
            </button>
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => router.push(`/profile/${u.id}`)}
            >
              <p className="text-xs font-semibold text-[#f3f3f3] truncate">
                {u.username}
              </p>
              <p className="text-xs text-[#555] truncate">
                {u._count.followers.toLocaleString()} người theo dõi
              </p>
            </div>
            <Button
              size="sm"
              variant={followingIds.has(u.id) ? "outline" : "default"}
              className="text-xs h-7 px-3 shrink-0"
              onClick={() => handleFollow(u.id)}
              disabled={loadingIds.has(u.id)}
            >
              {loadingIds.has(u.id) ? (
                <Spinner size="sm" />
              ) : followingIds.has(u.id) ? (
                "Đang theo dõi"
              ) : (
                "Theo dõi"
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
