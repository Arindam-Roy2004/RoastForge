"use client";

import { cn } from "@/lib/utils";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { MouseEvent } from "react";

type Reaction = "like" | "dislike";

type Props = {
  likesCount: number;
  dislikesCount: number;
  viewerReaction?: Reaction | null;
  pending?: boolean;
  disabled?: boolean;
  stopNavigation?: boolean;
  onReact: (reaction: Reaction) => void;
  className?: string;
};

/**
 * Like / dislike counters.
 *
 * Styled as a pair of small count-buttons in the shadcn/Vercel idiom: a hairline
 * border, `rounded-md`, `text-xs font-medium`, and colour-only feedback on
 * hover. The previous version had square corners, the display face at 10px with
 * wide tracking, and a `-translate-y-0.5` hover lift — three things that made a
 * 28px control feel like a novelty chip. Nothing moves on hover now; the fill
 * change carries the state, which is also what the rest of the chrome does.
 *
 * `aria-pressed` rather than only `aria-label`: these are toggles (clicking an
 * active reaction removes it), so the pressed state belongs in the semantics
 * instead of only in the label text.
 */
export function ResumeReactionControls({
  likesCount,
  dislikesCount,
  viewerReaction = null,
  pending = false,
  disabled = false,
  stopNavigation = false,
  onReact,
  className,
}: Props) {
  const isDisabled = disabled || pending;

  const click = (e: MouseEvent, reaction: Reaction) => {
    if (stopNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isDisabled) return;
    onReact(reaction);
  };

  const base =
    "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={(e) => click(e, "like")}
        disabled={isDisabled}
        aria-pressed={viewerReaction === "like"}
        aria-label={viewerReaction === "like" ? "Remove like" : "Like resume"}
        className={cn(
          base,
          viewerReaction === "like"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ThumbsUp aria-hidden className="size-3.5 shrink-0" />
        {Math.max(0, likesCount || 0)}
      </button>
      <button
        type="button"
        onClick={(e) => click(e, "dislike")}
        disabled={isDisabled}
        aria-pressed={viewerReaction === "dislike"}
        aria-label={viewerReaction === "dislike" ? "Remove dislike" : "Dislike resume"}
        className={cn(
          base,
          viewerReaction === "dislike"
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ThumbsDown aria-hidden className="size-3.5 shrink-0" />
        {Math.max(0, dislikesCount || 0)}
      </button>
    </div>
  );
}
