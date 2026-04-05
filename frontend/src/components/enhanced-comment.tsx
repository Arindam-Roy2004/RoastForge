"use client";

import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { commentApi, type Comment } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import {
  FaChevronDown,
  FaChevronUp,
  FaReply,
  FaThumbsDown,
  FaThumbsUp,
} from "react-icons/fa";
import { ComicCard } from "./comic-card";

export function EnhancedComment({
  comment,
  allComments,
  onRefresh,
  isReply = false,
}: {
  comment: Comment;
  allComments: Comment[];
  onRefresh: () => void;
  isReply?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const replies = allComments.filter((c) => c.parentId === comment._id);
  const alias = comment.userId?.anonymousUsername || "Anon";

  // Extract roast type from text if prepended (e.g. "[STRENGTH] Looks good")
  const roastMatch = comment.text.match(/^\[(STRENGTH|WEAKNESS|SUGGESTION)\](.*)/i);
  const extractedType = roastMatch ? roastMatch[1].toLowerCase() : "comment";
  const cleanText = roastMatch ? roastMatch[2].trim() : comment.text;

  const typeColor: Record<string, string> = {
    strength: "bg-green-300",
    weakness: "bg-red-300",
    suggestion: "bg-blue-300",
    comment: "bg-white",
  };

  async function vote(value: 1 | -1) {
    if (!user) {
      toast.error("Please sign in to vote");
      router.push("/login");
      return;
    }
    try {
      await commentApi.vote(comment._id, value === 1 ? "upvote" : "downvote");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    }
  }

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to reply");
      router.push("/login");
      return;
    }
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await commentApi.addReply(comment._id, replyText.trim());
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
          <div className="w-8 h-8 rounded-full comic-border-2 bg-teal flex items-center justify-center text-sm font-bold shrink-0 uppercase">
            {alias.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn(display.className, "text-sm")}>{alias}</span>
              <span className={cn("rounded-full comic-border-2 px-2 py-0.5 text-[10px] font-bold uppercase", typeColor[extractedType] || "bg-white")}>
                {extractedType}
              </span>
              <span className="text-[10px] text-[#2c2c2c]/50">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className={cn(body.className, "text-sm whitespace-pre-wrap")}>{cleanText}</p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button type="button" onClick={() => vote(1)} className="flex items-center gap-1 px-2 py-1 rounded-full comic-border-2 bg-green-200 hover:bg-green-300 comic-shadow-2 comic-lift text-xs">
                <FaThumbsUp /> {comment.upvotesCount}
              </button>
              <button type="button" onClick={() => vote(-1)} className="flex items-center gap-1 px-2 py-1 rounded-full comic-border-2 bg-red-200 hover:bg-red-300 comic-shadow-2 comic-lift text-xs">
                <FaThumbsDown /> {comment.downvotesCount}
              </button>
              {!isReply && (
                <button type="button" onClick={() => user ? setShowReplyForm(!showReplyForm) : router.push("/login")} className="flex items-center gap-1 px-2 py-1 rounded-full comic-border-2 bg-blue-200 hover:bg-blue-300 comic-shadow-2 comic-lift text-xs">
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
        <EnhancedComment key={r._id} comment={r} allComments={allComments} onRefresh={onRefresh} isReply />
      ))}
    </div>
  );
}
