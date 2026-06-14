"use client";
import { create } from "zustand";

interface UIState {
  isCreatePostOpen: boolean;
  setCreatePostOpen: (open: boolean) => void;
  unreadMessages: number;
  unreadNotifications: number;
  setUnreadMessages: (count: number) => void;
  setUnreadNotifications: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCreatePostOpen: false,
  setCreatePostOpen: (open) => set({ isCreatePostOpen: open }),
  unreadMessages: 0,
  unreadNotifications: 0,
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
}));
