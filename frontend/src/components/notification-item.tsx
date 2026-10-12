"use client";

import Link from "next/link";
import { ArrowBigUp, Check, Heart, MessageSquare, Reply, X, type LucideIcon } from "lucide-react";
import { GradientAvatar } from "@/components/gradient-avatar";
import type { AppNotification, NotificationType } from "@/lib/api";
import { cn } from "@/lib/utils";

// Type badge in the corner of the avatar, as in Linear's inbox. Static class
// strings (not built from a colour name) so Tailwind sees them.
const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  like: { icon: Heart, tone: "bg-rose-500 text-white" },
  comment_like: { icon: ArrowBigUp, tone: "bg-orange-500 text-white" },
  comment: { icon: MessageSquare, tone: "bg-sky-500 text-white" },
  reply: { icon: Reply, tone: "bg-indigo-500 text-white" },
};

/** The sentence, split so the people and the post can be set in a heavier weight. */
function sentence(n: AppNotification) {
  const who = `u/${n.actor?.anonymousUsername ?? "someone"}`;
  const others = n.count - 1;
  const group = others > 0 ? `${who} and ${others} other${others === 1 ? "" : "s"}` : who;
  const post = n.resumeTitle ? `“${n.resumeTitle}”` : "";

  switch (n.type) {
    case "like":
      return { lead: group, verb: "liked your post", post };
    case "comment_like":
      return { lead: group, verb: "upvoted your comment", post: post && `on ${post}` };
    case "comment":
      return { lead: who, verb: "commented on", post: post || "your post" };
    case "reply":
      return { lead: who, verb: "replied to your comment", post: post && `on ${post}` };
  }
}

export function hrefFor(n: AppNotification): string {
  return n.resumeId ? `/resume/${n.resumeId}` : "/";
}

/** Compact, Linear-style: now, 5m, 3h, 2d, then a date. */
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

const fullDate = (iso: string) =>
  new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });

/**
 * One notification. Unread is louder, not just dotted: full-contrast text and a
 * tinted row, against muted text once read. Hover actions are always visible on
 * touch screens, where there is no hover.
 */
export function NotificationItem({
  n,
  onOpen,
  onMarkRead,
  onDismiss,
}: {
  n: AppNotification;
  onOpen: (n: AppNotification) => void;
  onMarkRead: (n: AppNotification) => void;
  onDismiss: (n: AppNotification) => void;
}) {
  const { icon: Icon, tone } = TYPE_META[n.type];
  const { lead, verb, post } = sentence(n);
  const unread = !n.readAt;

  return (
    <li className="group relative">
      <Link
        href={hrefFor(n)}
        onClick={() => onOpen(n)}
        data-notif-link
        className={cn(
          "flex items-start gap-3 py-3 pr-4 pl-5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60",
          unread && "bg-primary/5",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-[1.65rem] left-2 size-1.5 rounded-full transition-opacity",
            unread ? "bg-primary" : "opacity-0",
          )}
        />

        <div className="relative shrink-0">
          {n.actor && (
            <GradientAvatar
              seed={n.actor._id}
              initial={n.actor.anonymousUsername.charAt(0)}
              className="size-9 text-sm"
            />
          )}
          <span
            className={cn(
              "flex items-center justify-center rounded-full",
              tone,
              n.actor ? "absolute -right-1 -bottom-1 size-4 ring-2 ring-card" : "size-9",
            )}
          >
            <Icon aria-hidden className={n.actor ? "size-2.5" : "size-4"} />
          </span>
        </div>

        <div className="min-w-0 flex-1 pr-10">
          <p className={cn("text-sm leading-snug", unread ? "text-foreground" : "text-muted-foreground")}>
            <span className="font-semibold">{lead}</span> {verb}
            {post && <span className={cn("ml-1", unread && "font-medium")}>{post}</span>}
          </p>

          {n.preview && (
            <p className="mt-1.5 line-clamp-2 border-l-2 border-border pl-2.5 text-xs leading-relaxed text-muted-foreground">
              {n.preview}
            </p>
          )}

          <time
            dateTime={n.lastEventAt}
            title={fullDate(n.lastEventAt)}
            className="mt-1 block text-xs text-muted-foreground/80 tabular-nums"
          >
            {timeAgo(n.lastEventAt)}
          </time>
        </div>
      </Link>

      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        {unread && (
          <button
            type="button"
            onClick={() => onMarkRead(n)}
            aria-label="Mark as read"
            title="Mark as read"
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
          >
            <Check aria-hidden className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(n)}
          aria-label="Dismiss notification"
          title="Dismiss"
          className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
