"use client";

import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import {
  FaChevronDown,
  FaChevronUp,
  FaReply,
  FaThumbsDown,
  FaThumbsUp,
} from "react-icons/fa";
import { ComicCard } from "./comic-card";

type Comment = {
  _id: string;
  content: string;
  type: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  reviewerId?: { anonymousPublicId?: string } | string;
  parentReviewId?: string | null;
};

export function EnhancedComment({
  comment,
  allComments,
  targetId,
  targetModel,
  onRefresh,
  isReply = false,
}: {
  comment: Comment;
  allComments: Comment[];
  targetId: string;
  targetModel: string;
  onRefresh: () => void;
  isReply?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const replies = allComments.filter((c) => c.parentReviewId === comment._id);
  const alias =
    typeof comment.reviewerId === "object"
      ? comment.reviewerId?.anonymousPublicId || "Anon"
      : "Anon";

  const typeColor: Record<string, string> = {
    strength: "bg-green-300",
    weakness: "bg-red-300",
    suggestion: "bg-blue-300",
    comment: "bg-yellow",
  };

  async function vote(value: 1 | -1) {
    try {
      await apiFetch(`/api/review/vote/${comment._id}`, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    }
  }

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/review", {
        method: "POST",
        body: JSON.stringify({
          targetId,
          targetModel,
          content: replyText.trim(),
          type: "comment",
          parentReviewId: comment._id,
        }),
      });
      setReplyText("");
      setShowReplyForm(false);
      setShowReplies(true);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn(isReply ? "ml-6 mt-2" : "mt-3")}>
      <ComicCard variant={isReply ? "light" : "cream"} shadow="small" className="p-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full comic-border-2 bg-teal flex items-center justify-center text-sm font-bold shrink-0">
            {alias.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn(display.className, "text-sm")}>{alias}</span>
              <span className={cn("rounded-full comic-border-2 px-2 py-0.5 text-[10px] font-bold", typeColor[comment.type] || "bg-beige")}>
                {comment.type}
              </span>
              <span className="text-[10px] text-[#2c2c2c]/50">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className={cn(body.className, "text-sm")}>{comment.content}</p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button type="button" onClick={() => vote(1)} className="flex items-center gap-1 px-2 py-1 rounded-full comic-border-2 bg-green-200 hover:bg-green-300 comic-shadow-2 comic-lift text-xs">
                <FaThumbsUp /> {comment.upvotes}
              </button>
              <button type="button" onClick={() => vote(-1)} className="flex items-center gap-1 px-2 py-1 rounded-full comic-border-2 bg-red-200 hover:bg-red-300 comic-shadow-2 comic-lift text-xs">
                <FaThumbsDown /> {comment.downvotes}
              </button>
              {!isReply && (
                <button type="button" onClick={() => setShowReplyForm(!showReplyForm)} className="flex items-center gap-1 px-2 py-1 rounded-full comic-border-2 bg-blue-200 hover:bg-blue-300 comic-shadow-2 comic-lift text-xs">
                  <FaReply /> Reply
                </button>
              )}
              {replies.length > 0 && (
                <button type="button" onClick={() => setShowReplies(!showReplies)} className="flex items-center gap-1 px-2 py-1 rounded-full comic-border-2 bg-yellow hover:bg-[#e8c98a] comic-shadow-2 comic-lift text-xs">
                  {showReplies ? <FaChevronUp /> : <FaChevronDown />} {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
          </div>
        </div>
      </ComicCard>

      {showReplyForm && (
        <form onSubmit={reply} className="ml-10 mt-2 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className={cn(body.className, "flex-1 p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white text-sm")}
            required
          />
          <button type="submit" disabled={submitting} className={cn(display.className, "comic-btn bg-green-400 comic-shadow-2 comic-lift text-xs py-1")}>
            {submitting ? "..." : "Post"}
          </button>
        </form>
      )}

      {showReplies && replies.map((r) => (
        <EnhancedComment key={r._id} comment={r} allComments={allComments} targetId={targetId} targetModel={targetModel} onRefresh={onRefresh} isReply />
      ))}
    </div>
  );
}
