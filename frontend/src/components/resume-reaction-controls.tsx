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

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={(e) => click(e, "like")}
        disabled={isDisabled}
        aria-label={viewerReaction === "like" ? "Remove like" : "Like resume"}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 border border-border bg-background px-2.5 font-heading text-[10px] tracking-wider shadow-[var(--shadow-2xs)] transition-all",
          " hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60",
          viewerReaction === "like"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span className="tabular-nums">{Math.max(0, likesCount || 0)}</span>
      </button>
      <button
        type="button"
        onClick={(e) => click(e, "dislike")}
        disabled={isDisabled}
        aria-label={viewerReaction === "dislike" ? "Remove dislike" : "Dislike resume"}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 border border-border bg-background px-2.5 font-heading text-[10px] tracking-wider shadow-[var(--shadow-2xs)] transition-all",
          " hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60",
          viewerReaction === "dislike"
            ? "bg-destructive text-destructive-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        <span className="tabular-nums">{Math.max(0, dislikesCount || 0)}</span>
      </button>
    </div>
  );
}

