"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-6 h-6" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-[#777] hover:bg-gray-100 dark:hover:bg-[#1e1e1e] hover:text-black dark:hover:text-[#f3f3f3] transition-colors cursor-pointer"
      title="Đổi giao diện"
    >
      {theme === "dark" ? (
        <>
          <Sun size={22} className="shrink-0 text-amber-500" />
          <span className="hidden xl:block text-sm font-medium">Chế độ sáng</span>
        </>
      ) : (
        <>
          <Moon size={22} className="shrink-0 text-indigo-600" />
          <span className="hidden xl:block text-sm font-medium">Chế độ tối</span>
        </>
      )}
    </button>
  );
}