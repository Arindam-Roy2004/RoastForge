"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { commentApi, type Comment } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import { ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EnhancedComment({
  comment,
  onRefresh,
}: {
  comment: Comment;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [voting, setVoting] = useState<"upvote" | "downvote" | null>(null);
  const [deleting, setDeleting] = useState(false);

  // `userId === null` → tombstoned (author deleted account but other users replied
  // below, so we kept the node to preserve their thread). Render muted + no actions.
  const isTombstoned = !comment.userId;
  const alias = isTombstoned ? "deleted" : comment.userId?.anonymousUsername || "Anon";

  const roastMatch = !isTombstoned && comment.text.match(/^\[(STRENGTH|WEAKNESS|SUGGESTION)\](.*)/i);
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
    if (voting) return;
    const direction = value === 1 ? "upvote" : "downvote";
    setVoting(direction);
    try {
      await commentApi.vote(comment._id, direction);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(null);
    }
  }

  async function deleteComment() {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    if (deleting) return;
    setDeleting(true);
    try {
      await commentApi.delete(comment._id);
      toast.success("Comment deleted");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={cn(
      "border-[3px] border-border rounded-none bg-card p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
      isTombstoned && "opacity-60",
    )}>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-border bg-primary/20 flex items-center justify-center text-xs font-mono font-bold uppercase shrink-0">
          {alias.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn(
              "font-mono text-xs font-bold tracking-tight text-foreground",
              isTombstoned && "italic text-muted-foreground",
            )}>u/{alias}</span>
            {!isTombstoned && (
              <Badge variant="outline" className={cn("border border-border rounded-none font-bold uppercase py-0 text-[10px]", typeStyles[extractedType])}>
                {extractedType}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground font-mono">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className={cn(
            "text-sm font-medium whitespace-pre-wrap leading-relaxed",
            isTombstoned && "italic text-muted-foreground",
          )}>{cleanText}</p>

          {/* Actions — hidden for tombstones (nothing to vote on / no owner to delete). */}
          {!isTombstoned && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center border-[3px] border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-muted shrink-0">
              <button
                type="button"
                onClick={() => vote(1)}
                disabled={voting !== null}
                aria-pressed={voting === "upvote"}
                aria-label={`Upvote (${comment.upvotesCount})`}
                className="px-2 py-1 hover:bg-green-200 transition-colors border-r-[3px] border-border flex items-center gap-1 font-bold text-xs font-heading disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ThumbsUp className="w-3 h-3" /> {comment.upvotesCount}
              </button>
              <button
                type="button"
                onClick={() => vote(-1)}
                disabled={voting !== null}
                aria-pressed={voting === "downvote"}
                aria-label={`Downvote (${comment.downvotesCount})`}
                className="px-2 py-1 hover:bg-red-200 transition-colors flex items-center gap-1 font-bold text-xs font-heading disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ThumbsDown className="w-3 h-3" /> {comment.downvotesCount}
              </button>
            </div>
            
            {user?.id === comment.userId?._id && (
              <Button variant="destructive" size="sm" onClick={deleteComment} disabled={deleting} className="border-2 border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all rounded-none font-heading uppercase text-[10px] h-7 px-2 ml-auto">
                <Trash2 className="w-3 h-3 mr-1" /> {deleting ? "…" : "Delete"}
              </Button>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
