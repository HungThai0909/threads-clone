"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Home,
  Search,
  PenSquare,
  Heart,
  MessageCircle,
  User,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { authService } from "@/services/auth.service";
import { UserAvatar } from "@/components/user/user-avatar";
import { CreatePostDialog } from "@/components/post/create-post-dialog";
import { SuggestedUsers } from "@/components/user/suggested-users";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/constants";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import { useQuery } from "@tanstack/react-query";
import { messageService } from "@/services/index";
import { QUERY_KEYS } from "@/constants";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";

const navItems = [
  { href: "/feed", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/notifications", icon: Heart, label: "Activity" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
];

function SocketInit() {
  useSocket();
  return null;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const {
    isCreatePostOpen,
    setCreatePostOpen,
    unreadMessages,
    unreadNotifications,
    setUnreadMessages,
  } = useUIStore();
  const isMessagesPage = pathname.startsWith("/messages");

  useQuery({
    queryKey: QUERY_KEYS.UNREAD_MESSAGES,
    queryFn: async () => {
      const res = await messageService.getUnreadCount();
      if (res.data?.unreadCount !== undefined) {
        setUnreadMessages(res.data.unreadCount);
      }
      return res;
    },
    enabled: _hasHydrated && isAuthenticated,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {}
    logout();
    router.replace("/login");
    toast.success("Đã đăng xuất thành công");
  };

  const getAvatarUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  };

  const userFallback = user?.username
    ? user.username.charAt(0).toUpperCase()
    : user?.fullname
      ? user.fullname.charAt(0).toUpperCase()
      : "U";

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <SocketInit />

      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-18 xl:w-60 border-r border-border bg-background px-3 py-6 z-40">
        <Link href="/feed" className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
            <svg viewBox="0 0 192 192" width="22" height="22" fill="none">
              <path
                d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.502 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.206 17.11 97.015 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 9.988 15.792 12.861 26.119l16.06-4.43c-3.426-12.82-8.853-23.799-16.285-32.811C147.917 10.503 126.397 1.205 97.101 1h-.241c-29.243.205-50.596 9.57-65.436 28.612C19.033 43.861 12.927 65.057 12.7 95.932v.136c.228 30.875 6.333 52.071 18.724 66.32 14.841 19.042 36.194 28.407 65.437 28.612h.241c26.339-.185 44.861-7.063 60.071-22.248 20.083-20.062 19.482-45.174 12.848-60.584-4.637-10.808-13.42-19.609-28.484-24.18Z"
                className="fill-current"
              />
            </svg>
          </div>
          <span className="hidden xl:block font-bold text-lg">Threads</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              pathname === href ||
              (href !== "/feed" && pathname.startsWith(href));
            const badge =
              href === "/messages" && unreadMessages > 0
                ? unreadMessages
                : href === "/notifications" && unreadNotifications > 0
                  ? unreadNotifications
                  : 0;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-[#777] hover:bg-muted hover:text-foreground",
                )}
              >
                <div className="relative shrink-0">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="hidden xl:block text-sm font-medium">
                  {label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setCreatePostOpen(true)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#777] hover:bg-muted hover:text-foreground transition-colors mt-1 cursor-pointer"
          >
            <PenSquare size={24} strokeWidth={2} className="shrink-0" />
            <span className="hidden xl:block text-sm font-medium">
              New thread
            </span>
          </button>
        </nav>

        <div className="flex flex-col gap-1 pt-4 border-t border-border">
          <ThemeToggle />

          <Link
            href={`/profile/${user?.id}`}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors",
              pathname.startsWith("/profile")
                ? "bg-muted text-foreground"
                : "text-[#777] hover:bg-muted hover:text-foreground",
            )}
          >
            <UserAvatar
              src={getAvatarUrl(user?.avatarUrl)}
              fallback={userFallback}
              size="xs"
              className="shrink-0"
            />
            <span className="hidden xl:block text-sm font-medium">Profile</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#777] hover:bg-muted hover:text-red-500 transition-colors cursor-pointer"
          >
            <LogOut size={22} className="shrink-0" />
            <span className="hidden xl:block text-sm font-medium">
              Đăng xuất
            </span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-18 xl:ml-60 min-h-screen">
        {isMessagesPage ? (
          <div className="h-screen overflow-hidden">{children}</div>
        ) : (
          <div className="flex">
            <div className="flex-1 max-w-170 mx-auto pb-20 md:pb-6 border-x border-border min-h-screen">
              {children}
            </div>
            <div className="hidden 2xl:block w-75 shrink-0 px-4 pt-6 space-y-4">
              <SuggestedUsers />
            </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-around px-2 py-2 z-40">
        {navItems.map(({ href, icon: Icon }) => {
          const isActive = pathname === href;
          const badge =
            href === "/messages" && unreadMessages > 0
              ? unreadMessages
              : href === "/notifications" && unreadNotifications > 0
                ? unreadNotifications
                : 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center p-2",
                isActive ? "text-foreground" : "text-[#777]",
              )}
            >
              <div className="relative">
                <Icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        <button
          onClick={() => setCreatePostOpen(true)}
          className="flex flex-col items-center p-2 text-[#777]"
        >
          <PenSquare size={26} strokeWidth={2} />
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex flex-col items-center p-2 text-xl cursor-pointer"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <Link
          href={`/profile/${user?.id}`}
          className={cn(
            "flex flex-col items-center p-2",
            pathname.startsWith("/profile") ? "text-foreground" : "text-[#777]",
          )}
        >
          <User
            size={26}
            strokeWidth={pathname.startsWith("/profile") ? 2.5 : 2}
          />
        </Link>
      </nav>

      <CreatePostDialog
        open={isCreatePostOpen}
        onClose={() => setCreatePostOpen(false)}
      />
    </div>
  );
}
