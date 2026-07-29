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
    strength: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
    weakness: "bg-orange-400/20 text-orange-600 dark:text-orange-300 dark:bg-orange-400/15 border border-orange-400/30",
    suggestion: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25",
    comment: "bg-muted text-foreground border border-border",
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
      "border border-border rounded-lg bg-card p-3 shadow-[var(--shadow-2xs)]",
      isTombstoned && "opacity-60",
    )}>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full border border-border bg-primary/20 flex items-center justify-center text-xs font-mono font-bold uppercase shrink-0">
          {alias.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn(
              "font-mono text-xs font-bold tracking-tight text-foreground",
              isTombstoned && "italic text-muted-foreground",
            )}>u/{alias}</span>
            {!isTombstoned && (
              <Badge variant="outline" className={cn("border border-border rounded-md font-bold uppercase py-0 text-[10px]", typeStyles[extractedType])}>
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
            <div className="flex shrink-0 items-center overflow-hidden rounded-md border-2 border-border bg-muted">
              <button
                type="button"
                onClick={() => vote(1)}
                disabled={voting !== null}
                aria-pressed={voting === "upvote"}
                aria-label={`Upvote (${comment.upvotesCount})`}
                className="px-2 py-1 hover:bg-green-200 transition-colors border-r border-border flex items-center gap-1 font-bold text-xs font-heading disabled:opacity-50 disabled:cursor-not-allowed"
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
              <Button variant="destructive" size="sm" onClick={deleteComment} disabled={deleting} className="border border-border shadow-[var(--shadow-2xs)] hover:shadow-[var(--shadow-sm)] transition-all rounded-lg font-heading uppercase text-[10px] h-7 px-2 ml-auto">
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

