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
    <div className={cn(isReply ? "ml-6 sm:ml-12 pl-4 border-l-4 border-border mt-4" : "mt-4")}>
      <Card className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-card p-4 sm:p-6 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-border bg-primary/20 flex flex-col items-center justify-center text-lg font-heading uppercase shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {alias.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-heading uppercase text-lg tracking-wide">{alias}</span>
              <Badge variant="outline" className={cn("border-2 border-border rounded-none font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] py-0 text-[10px]", typeStyles[extractedType])}>
                {extractedType}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{cleanText}</p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="flex items-center border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-muted shrink-0">
                <button type="button" onClick={() => vote(1)} className="px-3 py-1.5 hover:bg-green-200 transition-colors border-r-2 border-border flex items-center gap-1 font-bold text-xs font-heading">
                  <ThumbsUp className="w-3 h-3" /> {comment.upvotesCount}
                </button>
                <button type="button" onClick={() => vote(-1)} className="px-3 py-1.5 hover:bg-red-200 transition-colors flex items-center gap-1 font-bold text-xs font-heading">
                  <ThumbsDown className="w-3 h-3" /> {comment.downvotesCount}
                </button>
              </div>
              
              {!isReply && (
                <Button variant="outline" size="sm" onClick={() => user ? setShowReplyForm(!showReplyForm) : router.push("/login")} className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all rounded-none font-heading uppercase text-xs h-8 px-3 hover:-translate-y-0.5">
                  <Reply className="w-3 h-3 mr-1.5" /> Reply
                </Button>
              )}
              
              {replies.length > 0 && (
                <Button variant="default" size="sm" onClick={() => setShowReplies(!showReplies)} className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all rounded-none font-heading uppercase text-xs h-8 px-3 bg-yellow text-black hover:bg-yellow hover:-translate-y-0.5">
                  {showReplies ? <ChevronUp className="w-3 h-3 mr-1.5" /> : <ChevronDown className="w-3 h-3 mr-1.5" />} {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </Button>
              )}
              
              {user?.id === comment.userId?._id && (
                <Button variant="destructive" size="sm" onClick={deleteComment} className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all rounded-none font-heading uppercase text-xs h-8 px-3 ml-auto hover:-translate-y-0.5">
                  <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {showReplyForm && (
        <form onSubmit={reply} className="mt-4 flex gap-2 w-full max-w-2xl bg-card p-3 border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 font-medium"
            required
          />
          <Button type="submit" disabled={submitting} className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none font-heading uppercase hover:shadow-none transition-all shrink-0">
            {submitting ? "..." : "Post"}
          </Button>
        </form>
      )}

      {showReplies && replies.map((r) => (
        <EnhancedComment key={r._id} comment={r} allComments={allComments} onRefresh={onRefresh} isReply />
      ))}
    </div>
  );
}
