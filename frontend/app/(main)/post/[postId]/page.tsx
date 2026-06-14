"use client";
import { useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { PostCard } from "@/components/post/post-card";
import { CommentSection } from "@/components/comment/comment-section";
import { PostSkeleton } from "@/components/post/post-skeleton";
import { CreatePostDialog } from "@/components/post/create-post-dialog";
import { UserAvatar } from "@/components/user/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import { postService } from "@/services/post.service";
import { commentService } from "@/services/index";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/constants";
import { useCommentActions } from "@/hooks/useCommentActions";

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, _hasHydrated } = useAuthStore();

  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);

  const commentInputRef = useRef<HTMLInputElement>(null);
  const postIdNum = parseInt(postId, 10);

  const {
    updateComment,
    deleteComment,
    likeComment,
    unlikeComment,
    createReply,
    updateReply,
    deleteReply,
    likeReply,
    unlikeReply,
  } = useCommentActions(postIdNum);

  const { data: postData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.POST(postIdNum),
    queryFn: () => postService.getPost(postIdNum),
    enabled: !!postIdNum,
  });

  const post = useMemo(() => {
    const rawPost = postData?.data;
    if (!rawPost) return null;

    if (
      _hasHydrated &&
      user &&
      String(rawPost.author?.id) === String(user.id)
    ) {
      return {
        ...rawPost,
        author: {
          ...rawPost.author,
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          avatarUrl: user.avatarUrl,
        },
      };
    }
    return rawPost;
  }, [postData?.data, user, _hasHydrated]);

  const handleQuickComment = async () => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      await commentService.createComment(postIdNum, replyText.trim());
      setReplyText("");
      toast.success("Đã đăng bình luận!");

      queryClient.setQueryData(QUERY_KEYS.POST(postIdNum), (old: any) => {
        if (!old?.data) return old;
        const oldData = old.data ?? old;
        return {
          ...old,
          data: { ...oldData, commentsCount: (oldData.commentsCount ?? 0) + 1 },
        };
      });

      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.COMMENTS(postIdNum),
      });
    } catch {
      toast.error("Không thể đăng bình luận");
    } finally {
      setPosting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pt-4">
        <div className="flex items-center gap-3 px-4 pb-4">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Thread</h1>
        </div>
        <PostSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-4 text-center py-16">
        <p className="text-muted-foreground">Thread không tồn tại.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-foreground mt-2 hover:underline cursor-pointer"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-20px)] relative">
      <div className="flex-1 pb-20">
        <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Thread</h1>
        </div>

        <PostCard
          post={post}
          isDetail
          onCommentClick={() => commentInputRef.current?.focus()}
          onLikeToggle={() => {}}
        />

        <CommentSection
          postId={postIdNum}
          onUpdateComment={(id: number, content: string) =>
            updateComment.mutate({ commentId: id, content })
          }
          onDeleteComment={(id: number) => deleteComment.mutate(id)}
          onLikeComment={(id: number) => likeComment.mutate(id)}
          onUnlikeComment={(id: number) => unlikeComment.mutate(id)}
          onCreateReply={({ commentId, content }) =>
            createReply.mutate({ commentId, content })
          }
          onUpdateReply={({ commentId, replyId, content }) =>
            updateReply.mutate({ commentId, replyId, content })
          }
          onDeleteReply={({ commentId, replyId }) =>
            deleteReply.mutate({ commentId, replyId })
          }
          onLikeReply={({ commentId, replyId }) =>
            likeReply.mutate({ commentId, replyId })
          }
          onUnlikeReply={({ commentId, replyId }) =>
            unlikeReply.mutate({ commentId, replyId })
          }
        />
      </div>

      <div className="sticky bottom-0 bg-background z-10 flex items-center gap-3 px-4 py-3 border-t border-b border-border">
        {!_hasHydrated ? (
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
        ) : (
          <UserAvatar
            src={user?.avatarUrl}
            fallback={user?.username?.charAt(0).toUpperCase() || "U"}
            size="sm"
          />
        )}

        <input
          ref={commentInputRef}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && handleQuickComment()
          }
          placeholder="Nhập bình luận của bạn..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          disabled={!_hasHydrated}
        />
        <button
          onClick={handleQuickComment}
          disabled={!replyText.trim() || posting || !_hasHydrated}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
        >
          {posting ? <Spinner size="sm" /> : <Send size={18} />}
        </button>
      </div>

      <CreatePostDialog
        open={replyDialogOpen}
        onClose={() => setReplyDialogOpen(false)}
        replyToPostId={postIdNum}
      />
    </div>
  );
}
