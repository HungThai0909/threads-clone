"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentService } from "@/services/index";
import { QUERY_KEYS } from "@/constants";
import { toast } from "sonner";

export const useCommentActions = (postId: number) => {
  const queryClient = useQueryClient();

  const updateComment = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => commentService.updateComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMENTS(postId) });
      toast.success("Đã cập nhật bình luận");
    },
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: number) =>
      commentService.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMENTS(postId) });
      toast.success("Đã xóa bình luận");
    },
  });

  const likeComment = useMutation({
    mutationFn: (commentId: number) =>
      commentService.likeComment(postId, commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.COMMENTS(postId),
      });
      const previousComments = queryClient.getQueryData(
        QUERY_KEYS.COMMENTS(postId),
      );

      queryClient.setQueryData(QUERY_KEYS.COMMENTS(postId), (old: any) => {
        if (!old) return old;
        const comments = Array.isArray(old) ? old : old.data || [];
        const updatedComments = comments.map((c: any) =>
          c.id === commentId
            ? {
                ...c,
                isLiked: true,
                likesCount: (Number(c.likesCount) || 0) + 1,
              }
            : c,
        );
        return Array.isArray(old)
          ? updatedComments
          : { ...old, data: updatedComments };
      });
      return { previousComments };
    },
    onError: (err, newTodo, context: any) => {
      queryClient.setQueryData(
        QUERY_KEYS.COMMENTS(postId),
        context.previousComments,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMENTS(postId) });
    },
  });

  const unlikeComment = useMutation({
    mutationFn: (commentId: number) =>
      commentService.unlikeComment(postId, commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.COMMENTS(postId),
      });
      const previousComments = queryClient.getQueryData(
        QUERY_KEYS.COMMENTS(postId),
      );

      queryClient.setQueryData(QUERY_KEYS.COMMENTS(postId), (old: any) => {
        if (!old) return old;
        const comments = Array.isArray(old) ? old : old.data || [];
        const updatedComments = comments.map((c: any) =>
          c.id === commentId
            ? {
                ...c,
                isLiked: false,
                likesCount: Math.max((Number(c.likesCount) || 1) - 1, 0),
              }
            : c,
        );
        return Array.isArray(old)
          ? updatedComments
          : { ...old, data: updatedComments };
      });
      return { previousComments };
    },
    onError: (err, newTodo, context: any) => {
      queryClient.setQueryData(
        QUERY_KEYS.COMMENTS(postId),
        context.previousComments,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMENTS(postId) });
    },
  });

  const createReply = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => commentService.createReply(postId, commentId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REPLIES(variables.commentId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMENTS(postId) });
      toast.success("Đã đăng phản hồi!");
    },
  });

  const updateReply = useMutation({
    mutationFn: ({
      commentId,
      replyId,
      content,
    }: {
      commentId: number;
      replyId: number;
      content: string;
    }) => commentService.updateReply(postId, commentId, replyId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REPLIES(variables.commentId),
      });
      toast.success("Đã cập nhật phản hồi");
    },
  });

  const deleteReply = useMutation({
    mutationFn: ({
      commentId,
      replyId,
    }: {
      commentId: number;
      replyId: number;
    }) => commentService.deleteReply(postId, commentId, replyId),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(QUERY_KEYS.COMMENTS(postId), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((c: any) =>
            c.id === variables.commentId
              ? { ...c, repliesCount: Math.max((c.repliesCount || 1) - 1, 0) }
              : c,
          ),
        };
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REPLIES(variables.commentId),
      });
      toast.success("Đã xóa phản hồi");
    },
  });

  const likeReply = useMutation({
    mutationFn: ({
      commentId,
      replyId,
    }: {
      commentId: number;
      replyId: number;
    }) => commentService.likeReply(postId, commentId, replyId),
    onMutate: async ({ commentId, replyId }) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.REPLIES(commentId),
      });
      const previousReplies = queryClient.getQueryData(
        QUERY_KEYS.REPLIES(commentId),
      );

      queryClient.setQueryData(QUERY_KEYS.REPLIES(commentId), (old: any) => {
        if (!old) return old;
        const replies = Array.isArray(old) ? old : old.data || [];
        const updatedReplies = replies.map((r: any) =>
          r.id === replyId
            ? {
                ...r,
                isLiked: true,
                is_liked: true,
                liked: true,
                likesCount: (Number(r.likesCount) || 0) + 1,
              }
            : r,
        );
        return Array.isArray(old)
          ? updatedReplies
          : { ...old, data: updatedReplies };
      });
      return { previousReplies };
    },
    onError: (err, variables, context: any) => {
      queryClient.setQueryData(
        QUERY_KEYS.REPLIES(variables.commentId),
        context.previousReplies,
      );
    },

    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        QUERY_KEYS.REPLIES(variables.commentId),
        (old: any) => {
          if (!old) return old;
          const replies = Array.isArray(old) ? old : old.data || [];
          const updatedReplies = replies.map((r: any) =>
            r.id === variables.replyId
              ? { ...r, isLiked: true, is_liked: true, liked: true }
              : r,
          );
          return Array.isArray(old)
            ? updatedReplies
            : { ...old, data: updatedReplies };
        },
      );
    },
  });

  const unlikeReply = useMutation({
    mutationFn: ({
      commentId,
      replyId,
    }: {
      commentId: number;
      replyId: number;
    }) => commentService.unlikeReply(postId, commentId, replyId),
    onMutate: async ({ commentId, replyId }) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.REPLIES(commentId),
      });
      const previousReplies = queryClient.getQueryData(
        QUERY_KEYS.REPLIES(commentId),
      );

      queryClient.setQueryData(QUERY_KEYS.REPLIES(commentId), (old: any) => {
        if (!old) return old;
        const replies = Array.isArray(old) ? old : old.data || [];
        const updatedReplies = replies.map((r: any) =>
          r.id === replyId
            ? {
                ...r,
                isLiked: false,
                is_liked: false,
                liked: false,
                likesCount: Math.max((Number(r.likesCount) || 1) - 1, 0),
              }
            : r,
        );
        return Array.isArray(old)
          ? updatedReplies
          : { ...old, data: updatedReplies };
      });
      return { previousReplies };
    },
    onError: (err, variables, context: any) => {
      queryClient.setQueryData(
        QUERY_KEYS.REPLIES(variables.commentId),
        context.previousReplies,
      );
    },

    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        QUERY_KEYS.REPLIES(variables.commentId),
        (old: any) => {
          if (!old) return old;
          const replies = Array.isArray(old) ? old : old.data || [];
          const updatedReplies = replies.map((r: any) =>
            r.id === variables.replyId
              ? { ...r, isLiked: false, is_liked: false, liked: false }
              : r,
          );
          return Array.isArray(old)
            ? updatedReplies
            : { ...old, data: updatedReplies };
        },
      );
    },
  });

  return {
    updateComment,
    deleteComment,
    likeComment,
    unlikeComment,
    createReply,
    updateReply,
    deleteReply,
    likeReply,
    unlikeReply,
  };
};
