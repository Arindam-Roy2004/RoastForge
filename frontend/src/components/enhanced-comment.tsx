"use client";

import { cn } from "@/lib/utils";
import { commentApi, type Comment } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import { ChevronDown, ChevronUp, Reply, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function EnhancedComment({
  comment,
  onRefresh,
  isReply = false,
}: {
  comment: Comment;
  onRefresh: () => void;
  isReply?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const replies = comment.replies || [];
  const alias = comment.userId?.anonymousUsername || "Anon";

  const roastMatch = comment.text.match(/^\[(STRENGTH|WEAKNESS|SUGGESTION)\](.*)/i);
  const extractedType = roastMatch ? roastMatch[1].toLowerCase() : "comment";
  const cleanText = roastMatch ? roastMatch[2].trim() : comment.text;

  const typeStyles: Record<string, string> = {
    strength: "bg-green-400 text-black",
    weakness: "bg-red-400 text-black",
    suggestion: "bg-blue-400 text-black",
    comment: "bg-muted text-foreground",
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

  async function deleteComment() {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await commentApi.delete(comment._id);
      toast.success("Comment deleted");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    }
  }

  return (
    <div className={cn(isReply ? "ml-6 sm:ml-10 pl-3 border-l-4 border-border mt-3" : "")}>
      <div className="border-2 border-border rounded-none bg-card p-3 sm:p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-border bg-primary/20 flex items-center justify-center text-sm font-heading uppercase shrink-0">
            {alias.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-heading uppercase text-sm tracking-wide">{alias}</span>
              <Badge variant="outline" className={cn("border border-border rounded-none font-bold uppercase py-0 text-[10px]", typeStyles[extractedType])}>
                {extractedType}
              </Badge>
              <span className="text-[11px] text-muted-foreground font-mono">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{cleanText}</p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <div className="flex items-center border-2 border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-muted shrink-0">
                <button type="button" onClick={() => vote(1)} className="px-2 py-1 hover:bg-green-200 transition-colors border-r-2 border-border flex items-center gap-1 font-bold text-xs font-heading">
                  <ThumbsUp className="w-3 h-3" /> {comment.upvotesCount}
                </button>
                <button type="button" onClick={() => vote(-1)} className="px-2 py-1 hover:bg-red-200 transition-colors flex items-center gap-1 font-bold text-xs font-heading">
                  <ThumbsDown className="w-3 h-3" /> {comment.downvotesCount}
                </button>
              </div>
              
              {!isReply && (
                <Button variant="outline" size="sm" onClick={() => user ? setShowReplyForm(!showReplyForm) : router.push("/login")} className="border-2 border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all rounded-none font-heading uppercase text-[10px] h-7 px-2">
                  <Reply className="w-3 h-3 mr-1" /> Reply
                </Button>
              )}
              
              {replies.length > 0 && (
                <Button variant="default" size="sm" onClick={() => setShowReplies(!showReplies)} className="border-2 border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all rounded-none font-heading uppercase text-[10px] h-7 px-2 bg-yellow text-black hover:bg-yellow">
                  {showReplies ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />} {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </Button>
              )}
              
              {user?.id === comment.userId?._id && (
                <Button variant="destructive" size="sm" onClick={deleteComment} className="border-2 border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all rounded-none font-heading uppercase text-[10px] h-7 px-2 ml-auto">
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReplyForm && (
        <form onSubmit={reply} className="mt-2 ml-11 flex gap-2 bg-card p-2 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="border-2 border-border rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 font-medium text-sm h-8"
            required
          />
          <Button type="submit" disabled={submitting} className="border-2 border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-none font-heading uppercase hover:shadow-none transition-all shrink-0 h-8 text-xs">
            {submitting ? "..." : "Post"}
          </Button>
        </form>
      )}

      {showReplies && replies.map((r) => (
        <EnhancedComment key={r._id} comment={r} onRefresh={onRefresh} isReply />
      ))}
    </div>
  );
}
