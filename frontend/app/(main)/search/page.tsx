"use client";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, TrendingUp, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "@/components/user/user-avatar";
import { PostCard } from "@/components/post/post-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { searchService, hashtagService } from "@/services/index";
import { postService } from "@/services/post.service";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/constants";
import { useDebounce } from "@/hooks/use-debounce";
import type { Post, UserMini, SearchHistoryItem, Hashtag } from "@/types";
import { getHistoryUser, getHistoryTime } from "@/types";

export default function SearchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const isSearching = debouncedQuery.trim().length > 0;

  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (debouncedQuery.trim().startsWith("#")) {
      setActiveTab("hashtags");
    } else if (
      isSearching &&
      activeTab === "hashtags" &&
      !debouncedQuery.trim().startsWith("#")
    ) {
      setActiveTab("users");
    }
  }, [debouncedQuery]);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: QUERY_KEYS.SEARCH_USERS(debouncedQuery),
    queryFn: () => searchService.searchUsers(debouncedQuery),
    enabled: isSearching && !debouncedQuery.trim().startsWith("#"),
    staleTime: 1000 * 30,
  });

  const users =
    (usersData?.data as (UserMini & {
      bio?: string | null;
      _count?: { followers: number; posts?: number };
    })[]) ?? [];

  const cleanQuery = debouncedQuery.trim().replace(/^@/, "");
  const matchedUser = users.find(
    (u) => u.username.toLowerCase() === cleanQuery.toLowerCase(),
  );

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: QUERY_KEYS.SEARCH_POSTS(debouncedQuery),
    queryFn: async () => {
      if (matchedUser) {
        const res = await postService.getUserPosts(matchedUser.id, 1, 50);
        return res as any;
      }
      const res = await searchService.searchPosts(debouncedQuery);
      return res as any;
    },
    enabled: isSearching && !usersLoading,
    staleTime: 1000 * 30,
  });

  const { data: hashtagsData, isLoading: hashtagsLoading } = useQuery({
    queryKey: ["SEARCH_HASHTAGS", debouncedQuery],
    queryFn: () => hashtagService.search(debouncedQuery),
    enabled: isSearching,
    staleTime: 1000 * 30,
  });

  const { data: historyData } = useQuery({
    queryKey: QUERY_KEYS.SEARCH_HISTORY,
    queryFn: () => searchService.getSearchHistory(10),
    enabled: isAuthenticated && !isSearching,
    staleTime: 1000 * 60,
  });

  const { data: trendingData } = useQuery({
    queryKey: QUERY_KEYS.TRENDING_HASHTAGS,
    queryFn: () => hashtagService.getTrending(),
    enabled: !isSearching,
    staleTime: 1000 * 60 * 5,
  });

  const posts = ((postsData as any)?.data as Post[]) ?? [];
  const historyRaw = (historyData?.data as SearchHistoryItem[]) ?? [];
  const trending = (trendingData?.data as Hashtag[]) ?? [];
  const dynamicHashtags = (hashtagsData as any)?.data ?? hashtagsData ?? [];

  const displayPostsCount =
    matchedUser && matchedUser._count?.posts !== undefined
      ? matchedUser._count.posts
      : posts.length;

  const handleDeleteHistory = async (id: number) => {
    await searchService.deleteSearchHistoryItem(id).catch(console.error);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH_HISTORY });
  };

  const handleClearHistory = async () => {
    await searchService.clearSearchHistory().catch(console.error);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH_HISTORY });
  };

  const handleUserClick = async (user: UserMini) => {
    if (isAuthenticated) {
      searchService.saveSearchHistory(user.id).catch(() => {});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SEARCH_HISTORY });
    }
    router.push(`/profile/${user.id}`);
  };

  return (
    <div className="pt-4">
      <div className="px-4 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-3">Tìm kiếm</h1>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm người dùng, bài viết, hashtag (thêm #)..."
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground/50 transition-colors"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!isSearching && (
        <div>
          {historyRaw.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-semibold text-foreground">
                  Gần đây
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Xóa tất cả
                </button>
              </div>
              {historyRaw.map((item: SearchHistoryItem) => {
                const u = getHistoryUser(item);
                const time = getHistoryTime(item);
                if (!u) return null;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border"
                    onClick={() => router.push(`/profile/${u.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={u.avatarUrl}
                        fallback={u.fullname}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {u.username}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.fullname}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(time), {
                          addSuffix: true,
                        })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(item.id);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {trending.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 px-4 py-2">
                <TrendingUp size={15} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  Đang thịnh hành
                </span>
              </div>
              {trending.map((tag: Hashtag) => (
                <button
                  key={tag.id}
                  onClick={() =>
                    router.push(`/hashtag/${encodeURIComponent(tag.name)}`)
                  }
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-foreground text-base shrink-0">
                    #
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      #{tag.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(tag.postsCount ?? 0).toLocaleString()} bài viết
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {historyRaw.length === 0 && trending.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Tìm người dùng, bài viết hoặc hashtag
            </div>
          )}
        </div>
      )}

      {isSearching && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted">
            <TabsTrigger 
              value="users"
              className="text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-bold"
            >
              Người dùng {users.length > 0 && `(${users.length})`}
            </TabsTrigger>
            <TabsTrigger 
              value="hashtags"
              className="text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-bold"
            >
              Hashtags {dynamicHashtags.length > 0 && `(${dynamicHashtags.length})`}
            </TabsTrigger>
            <TabsTrigger 
              value="posts"
              className="text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-bold"
            >
              Bài viết {displayPostsCount > 0 && `(${displayPostsCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {usersLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Không tìm thấy người dùng nào với &quot;{debouncedQuery}&quot;
              </div>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleUserClick(u)}
                  className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/50 transition-colors text-left border-b border-border cursor-pointer"
                >
                  <UserAvatar
                    src={u.avatarUrl}
                    fallback={u.fullname}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {u.username}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.fullname}</p>
                    {u.bio && (
                      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                        {u.bio}
                      </p>
                    )}
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {u._count && (
                        <span>
                          {u._count.followers.toLocaleString()} người theo dõi
                        </span>
                      )}
                      {u._count?.posts !== undefined && (
                        <span>• {u._count.posts} bài viết</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="hashtags">
            {hashtagsLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : dynamicHashtags.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Không tìm thấy thẻ hashtag nào khớp với &quot;{debouncedQuery}
                &quot;
              </div>
            ) : (
              dynamicHashtags.map((tag: Hashtag) => (
                <button
                  key={tag.id}
                  onClick={() =>
                    router.push(`/hashtag/${encodeURIComponent(tag.name)}`)
                  }
                  className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/50 transition-colors text-left border-b border-border cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                    <Hash size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      #{tag.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(tag.postsCount ?? 0).toLocaleString()} bài viết liên quan
                    </p>
                  </div>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="posts">
            {postsLoading || usersLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Không tìm thấy bài viết nào tương ứng.
              </div>
            ) : (
              posts.map((post: Post) => <PostCard key={post.id} post={post} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}