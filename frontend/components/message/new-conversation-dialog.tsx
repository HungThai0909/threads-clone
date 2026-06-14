"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user/user-avatar";
import { searchService, messageService } from "@/services/index";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { UserMini } from "@/types";

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: number) => void;
}

export function NewConversationDialog({
  open,
  onClose,
  onCreated,
}: NewConversationDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserMini[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const debouncedQuery = useDebounce(query, 350);

  const { data: searchData, isLoading } = useQuery({
    queryKey: ["new-conv-search", debouncedQuery],
    queryFn: () => searchService.searchUsers(debouncedQuery, 1, 10),
    enabled: debouncedQuery.trim().length > 0,
  });

  const results =
    (searchData?.data as (UserMini & { bio?: string | null })[]) ?? [];
  const isGroup = selectedUsers.length > 1;

  const toggleUser = (u: UserMini) => {
    setSelectedUsers((prev) =>
      prev.find((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u],
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Select at least one user");
      return;
    }
    if (isGroup && !groupName.trim()) {
      toast.error("Enter a group name");
      return;
    }
    setCreating(true);
    try {
      const res = await messageService.getOrCreateConversation({
        participantIds: selectedUsers.map((u) => u.id),
        ...(isGroup && { name: groupName.trim(), isGroup: true }),
      });
      if (res.data?.id) {
        onCreated(res.data.id);
        setSelectedUsers([]);
        setGroupName("");
        setQuery("");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to create conversation",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setSelectedUsers([]);
    setGroupName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#2a2a2a]">
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[#2a2a2a]">
            {selectedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-1.5 bg-[#2a2a2a] rounded-full px-2.5 py-1"
              >
                <UserAvatar src={u.avatarUrl} fallback={u.fullname} size="xs" />
                <span className="text-xs text-[#f3f3f3]">{u.username}</span>
                <button
                  onClick={() => toggleUser(u)}
                  className="text-[#777] hover:text-[#f3f3f3]"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isGroup && (
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-[#f3f3f3] placeholder:text-[#555] focus:outline-none focus:border-[#555]"
            />
          </div>
        )}

        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-sm text-[#f3f3f3] placeholder:text-[#555] focus:outline-none focus:border-[#555]"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : debouncedQuery && results.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#555]">
              No users found
            </div>
          ) : (
            results.map((u) => {
              const selected = !!selectedUsers.find((x) => x.id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left",
                    selected && "bg-[#1a1a1a]",
                  )}
                >
                  <UserAvatar
                    src={u.avatarUrl}
                    fallback={u.fullname}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f3f3f3]">
                      {u.username}
                    </p>
                    <p className="text-xs text-[#555] truncate">{u.fullname}</p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                      selected
                        ? "border-[#f3f3f3] bg-[#f3f3f3]"
                        : "border-[#2a2a2a] bg-transparent",
                    )}
                  >
                    {selected && (
                      <svg
                        viewBox="0 0 10 10"
                        width="10"
                        height="10"
                        fill="none"
                      >
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="#101010"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3 px-4 pb-5 pt-3 border-t border-[#2a2a2a]">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleCreate}
            disabled={
              selectedUsers.length === 0 ||
              creating ||
              (isGroup && !groupName.trim())
            }
          >
            {creating ? (
              <Spinner size="sm" />
            ) : isGroup ? (
              "Create group"
            ) : (
              "Open chat"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
