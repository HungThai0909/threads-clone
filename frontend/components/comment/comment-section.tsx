"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Heart, MoreHorizontal, Send, Check, X } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { commentService } from "@/services/index";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/constants";
import { cn } from "@/lib/utils";
import type { Comment, Reply } from "@/types";

const getFallback = (name: string) => name?.charAt(0).toUpperCase() ?? "U";

function ReplyItem({
  reply,
  commentId,
  onLike,
  onUnlike,
  onDelete,
  onUpdate,
}: any) {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(reply.content);
  const isOwner = user?.id === reply.author.id;

  const hasLiked = !!(
    reply.isLiked === true ||
    reply.is_liked === true ||
    reply.liked === true
  );

  const handleUpdate = () => {
    onUpdate({ commentId, replyId: reply.id, content });
    setIsEditing(false);
  };

  return (
    <div className="flex gap-2 animate-fade-in py-2">
      <UserAvatar
        src={reply.author.avatarUrl}
        fallback={getFallback(reply.author.username)}
        size="xs"
      />
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            {reply.author.username}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(reply.createdAt), {
              addSuffix: true,
              locale: vi,
            })}
          </span>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-muted text-xs text-foreground p-1.5 rounded w-full outline-none border border-border"
            />
            <button onClick={handleUpdate}>
              <Check size={14} className="text-green-500 cursor-pointer shrink-0" />
            </button>
            <button onClick={() => setIsEditing(false)}>
              <X size={14} className="text-red-500 cursor-pointer shrink-0" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-foreground/90 mt-0.5">{reply.content}</p>
        )}

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => {
              if (hasLiked) {
                if (typeof onUnlike === "function")
                  onUnlike({ commentId, replyId: reply.id });
              } else {
                if (typeof onLike === "function")
                  onLike({ commentId, replyId: reply.id });
              }
            }}
            className="flex items-center gap-1 group cursor-pointer"
          >
            <Heart
              size={14}
              fill={hasLiked ? "currentColor" : "none"}
              className={cn(
                "transition-all duration-200",
                hasLiked
                  ? "text-red-500 fill-red-500"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            <span
              className={cn(
                "text-[10px]",
                hasLiked
                  ? "text-red-500"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {reply.likesCount || 0}
            </span>
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Sửa
              </button>
              <button
                onClick={() => onDelete({ commentId, replyId: reply.id })}
                className="text-[10px] text-red-500 hover:text-red-400 cursor-pointer"
              >
                Xóa
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RepliesList({
  postId,
  commentId,
  onLikeReply,
  onUnlikeReply,
  onDeleteReply,
  onUpdateReply,
}: any) {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.REPLIES(commentId),
    queryFn: () => commentService.getReplies(postId, commentId),
  });

  const replies = Array.isArray(data) ? data : (data?.data ?? []);

  if (isLoading)
    return (
      <div className="py-2 pl-10">
        <Spinner size="sm" />
      </div>
    );

  return (
    <div className="ml-10 mt-2 border-l border-border pl-4">
      {replies.map((reply: Reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          commentId={commentId}
          onLike={onLikeReply}
          onUnlike={onUnlikeReply}
          onDelete={onDeleteReply}
          onUpdate={onUpdateReply}
        />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  onUpdateComment,
  onLikeComment,
  onUnlikeComment,
  onDeleteComment,
  onLikeReply,
  onUnlikeReply,
  onDeleteReply,
  onUpdateReply,
  onCreateReply,
}: any) {
  const { user } = useAuthStore();
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [replyText, setReplyText] = useState("");
  const isOwner = user?.id === comment.author.id;

  const handleCreateReply = () => {
    if (!replyText.trim()) return;
    onCreateReply({ commentId: comment.id, content: replyText.trim() });
    setReplyText("");
    setIsReplying(false);
    setShowReplies(true);
  };

  const isCommentLiked = !!comment.isLiked;

  return (
    <div className="py-3 px-4 border-b border-border">
      <div className="flex gap-3">
        <UserAvatar
          src={comment.author.avatarUrl}
          fallback={getFallback(comment.author.username)}
          size="sm"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {comment.author.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: vi,
                })}
              </span>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <MoreHorizontal
                    size={14}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-red-500 focus:text-red-500"
                  >
                    Xóa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {isEditing ? (
            <div className="mt-1 flex gap-2">
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-muted p-1.5 rounded text-sm w-full text-foreground border border-border outline-none"
              />
              <button
                onClick={() => {
                  onUpdateComment(comment.id, content);
                  setIsEditing(false);
                }}
              >
                <Check size={16} className="text-foreground cursor-pointer shrink-0" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() =>
                isCommentLiked
                  ? onUnlikeComment(comment.id)
                  : onLikeComment(comment.id)
              }
              className="flex items-center gap-1 group cursor-pointer"
            >
              <Heart
                size={16}
                fill={isCommentLiked ? "currentColor" : "none"}
                className={cn(
                  "transition-all duration-200",
                  isCommentLiked ? "fill-red-500 text-red-500" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  isCommentLiked ? "text-red-500" : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {comment.likesCount || 0}
              </span>
            </button>

            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Phản hồi
            </button>

            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {comment.repliesCount || 0} phản hồi
            </button>
          </div>

          {isReplying && (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Viết phản hồi..."
                className="bg-muted p-1.5 rounded text-sm w-full outline-none text-foreground border border-border"
              />
              <button onClick={handleCreateReply}>
                <Send size={16} className="text-blue-500 cursor-pointer shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showReplies && (
        <RepliesList
          postId={postId}
          commentId={comment.id}
          onLikeReply={onLikeReply}
          onUnlikeReply={onUnlikeReply}
          onDeleteReply={onDeleteReply}
          onUpdateReply={onUpdateReply}
        />
      )}
    </div>
  );
}

interface CommentSectionProps {
  postId: number;
  onUpdateComment: (id: number, content: string) => void;
  onDeleteComment: (id: number) => void;
  onLikeComment: (id: number) => void;
  onUnlikeComment: (id: number) => void;
  onCreateReply: (payload: { commentId: number; content: string }) => void;
  onUpdateReply: (payload: {
    commentId: number;
    replyId: number;
    content: string;
  }) => void;
  onDeleteReply: (payload: { commentId: number; replyId: number }) => void;
  onLikeReply: (payload: { commentId: number; replyId: number }) => void;
  onUnlikeReply: (payload: { commentId: number; replyId: number }) => void;
}

export function CommentSection({ postId, ...actions }: CommentSectionProps) {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.COMMENTS(postId),
    queryFn: () => commentService.getComments(postId),
  });

  return (
    <div>
      {(data?.data ?? []).map((c: Comment) => (
        <CommentItem key={c.id} comment={c} postId={postId} {...actions} />
      ))}
    </div>
  );
}