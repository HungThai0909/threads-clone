"use client";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants";

interface FollowListModalProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  type: "followers" | "following";
}

export function FollowListModal({
  open,
  onClose,
  userId,
  type,
}: FollowListModalProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const { data: followData, isLoading } = useQuery({
    queryKey: [type, userId],
    queryFn: () =>
      type === "followers"
        ? userService.getFollowers(userId)
        : userService.getFollowing(userId),
    enabled: open && !!userId,
  });

  const listUsers = (followData?.data as any[]) ?? [];

  useEffect(() => {
    if (open && listUsers.length > 0) {
      const initialFollowing = new Set<number>();
      const isOwnProfile = currentUser?.id === userId;

      listUsers.forEach((item: any) => {
        const u = item.follower || item.following || item;

        if (isOwnProfile) {
          if (type === "following") {
            initialFollowing.add(u.id);
          } else if (type === "followers" && u.isFollowing) {
            initialFollowing.add(u.id);
          }
        } else {
          if (u.isFollowing || item.isFollowing) {
            initialFollowing.add(u.id);
          }
        }
      });

      setFollowingIds(initialFollowing);
    }
  }, [followData, listUsers, type, open, currentUser?.id, userId]);

  const updateCrossModalCache = (targetUser: any, isNowFollowing: boolean) => {
    const targetId = targetUser.id;
    if (!currentUser?.id) return;

    queryClient.setQueryData([type, userId], (oldData: any) => {
      if (!oldData || !oldData.data) return oldData;

      if (
        currentUser.id === userId &&
        type === "following" &&
        !isNowFollowing
      ) {
        return {
          ...oldData,
          data: oldData.data.filter((item: any) => {
            const u = item.follower || item.following || item;
            return u.id !== targetId;
          }),
        };
      }

      return {
        ...oldData,
        data: oldData.data.map((item: any) => {
          const u = item.follower || item.following || item;
          if (u.id === targetId) {
            if (item.follower)
              return {
                ...item,
                follower: { ...item.follower, isFollowing: isNowFollowing },
              };
            if (item.following)
              return {
                ...item,
                following: { ...item.following, isFollowing: isNowFollowing },
              };
            return { ...item, isFollowing: isNowFollowing };
          }
          return item;
        }),
      };
    });

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
                currentFollowingCount + (isNowFollowing ? 1 : -1),
              ),
            },
          },
        };
      },
    );

    queryClient.setQueryData(["following", currentUser.id], (oldData: any) => {
      if (!oldData || !oldData.data) return oldData;

      if (isNowFollowing) {
        const exists = oldData.data.some(
          (item: any) =>
            (item.following?.id || item.follower?.id || item.id) === targetId,
        );
        if (!exists) {
          const newFollowingItem = {
            createdAt: new Date().toISOString(),
            following: { ...targetUser, isFollowing: true },
          };
          return { ...oldData, data: [newFollowingItem, ...oldData.data] };
        }
      } else {
        return {
          ...oldData,
          data: oldData.data.filter((item: any) => {
            const u = item.follower || item.following || item;
            return u.id !== targetId;
          }),
        };
      }
      return oldData;
    });

    if (targetId === userId) {
      queryClient.setQueryData(
        QUERY_KEYS.USER_PROFILE(userId),
        (oldData: any) => {
          if (!oldData || !oldData.data) return oldData;
          const currentFollowersCount = oldData.data._count?.followers ?? 0;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              isFollowing: isNowFollowing,
              _count: {
                ...oldData.data._count,
                followers: Math.max(
                  0,
                  currentFollowersCount + (isNowFollowing ? 1 : -1),
                ),
              },
            },
          };
        },
      );
    }
  };

  const handleFollowAction = async (targetUser: any) => {
    if (currentUser?.id === targetUser.id) {
      toast.error("Bạn không thể tự theo dõi chính mình!");
      return;
    }

    const targetId = targetUser.id;
    const isCurrentlyFollowing = followingIds.has(targetId);

    setLoadingIds((prev) => new Set(prev).add(targetId));

    try {
      if (isCurrentlyFollowing) {
        await userService.unfollow(targetId);
        toast.success(`Đã hủy theo dõi @${targetUser.username}`);

        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });

        updateCrossModalCache(targetUser, false);
      } else {
        await userService.follow(targetId);
        toast.success(`Đang theo dõi @${targetUser.username}`);

        setFollowingIds((prev) => new Set(prev).add(targetId));

        updateCrossModalCache(targetUser, true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25 bg-[#101010] border-[#222] text-white">
        <DialogHeader>
          <DialogTitle className="text-center font-bold">
            {type === "followers" ? "Người theo dõi" : "Đang theo dõi"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-87.5 overflow-y-auto space-y-4 pr-1 mt-2 selection:bg-transparent">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : listUsers.length === 0 ? (
            <div className="text-center text-sm text-[#555] py-6">
              {type === "followers"
                ? "Chưa có người theo dõi nào."
                : "Chưa theo dõi ai."}
            </div>
          ) : (
            listUsers.map((item: any) => {
              const u = item.follower || item.following || item;
              const isMe = currentUser?.id === u.id;

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      src={u.avatarUrl}
                      fallback={u.username || "?"}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">
                        {u.fullname}
                      </p>
                      <p className="text-xs text-[#777]">@{u.username}</p>
                    </div>
                  </div>

                  {isMe ? (
                    <span className="text-xs text-[#555] px-4 py-1.5 bg-[#1a1a1a] rounded-lg font-medium select-none">
                      Bạn
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={followingIds.has(u.id) ? "outline" : "default"}
                      className="text-xs h-8 px-4 font-medium transition-all min-w-28"
                      onClick={() => handleFollowAction(u)}
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
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
