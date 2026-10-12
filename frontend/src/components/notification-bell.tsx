"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff, CheckCheck, CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NotificationItem } from "@/components/notification-item";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationApi, type AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { refreshUnreadCount, setUnreadCount, useUnreadCount } from "@/store/unread-count";

const PAGE_SIZE = 15;

type Tab = "all" | "unread";

// ─── Day grouping ────────────────────────────────────────────────────────────

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function dayLabel(iso: string): string {
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return "Earlier";
}

// ─── Panel states ────────────────────────────────────────────────────────────

function RowSkeletons({ rows }: { rows: number }) {
  return (
    <div className="space-y-4 px-5 py-4" aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Notice({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof BellOff;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-8 py-12 text-center">
      <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && <p className="max-w-[28ch] text-xs leading-relaxed text-muted-foreground">{body}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const unread = useUnreadCount(Boolean(user));

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState<"first" | "more" | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Drops responses from a superseded request (fast tab switching, close/reopen).
  const requestId = useRef(0);

  /** Loads page 1 for `forTab`, or the page after `from`. */
  const load = useCallback(async (forTab: Tab, from: string | null) => {
    const id = ++requestId.current;
    const more = from !== null;
    if (more) setLoadingMore(true);
    else setLoading(true);
    setFailed(null);
    try {
      const res = await notificationApi.list({
        unread: forTab === "unread",
        limit: PAGE_SIZE,
        cursor: from,
      });
      if (id !== requestId.current) return;
      const page = res.data?.items ?? [];
      setItems((prev) => {
        if (!more) return page;
        // A row that gained activity can move between pages; never show it twice.
        const seen = new Set(prev.map((p) => p._id));
        return [...prev, ...page.filter((p) => !seen.has(p._id))];
      });
      setCursor(res.data?.nextCursor ?? null);
    } catch {
      if (id === requestId.current) setFailed(more ? "more" : "first");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const reset = (forTab: Tab) => {
    setItems([]);
    setCursor(null);
    scrollRef.current?.scrollTo({ top: 0 });
    void load(forTab, null);
  };

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    reset(tab);
    // Opening is a good moment to reconcile the badge with the server.
    void refreshUnreadCount();
  };

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    reset(next);
  };

  // Close on outside click / Escape (returning focus to the bell).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Infinite scroll: fetch the next page as the end of the list nears the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!open || !sentinel || !root || !cursor || loading || loadingMore || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void load(tab, cursor);
      },
      { root, rootMargin: "120px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, cursor, loading, loadingMore, failed, tab, load]);

  if (!user) return null;

  // ↑/↓ move between rows without leaving the keyboard.
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = Array.from(scrollRef.current?.querySelectorAll<HTMLElement>("[data-notif-link]") ?? []);
    const at = links.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? at + 1 : at - 1;
    if (next < 0 || next >= links.length) return;
    e.preventDefault();
    links[next].focus();
  };

  // Failed writes are corrected by re-reading, not by guessing the previous state.
  const recover = () => {
    toast.error("Couldn’t update that notification. Refreshing…");
    void refreshUnreadCount();
    reset(tab);
  };

  const markRead = (n: AppNotification) => {
    if (n.readAt) return;
    // Optimistic: the row and badge update now.
    const now = new Date().toISOString();
    setItems((prev) =>
      tab === "unread"
        ? prev.filter((x) => x._id !== n._id)
        : prev.map((x) => (x._id === n._id ? { ...x, readAt: now } : x)),
    );
    setUnreadCount(unread - 1);
    notificationApi.markRead(n._id).catch(recover);
  };

  const openItem = (n: AppNotification) => {
    setOpen(false);
    if (!n.readAt) {
      setUnreadCount(unread - 1);
      notificationApi.markRead(n._id).catch(() => void refreshUnreadCount());
    }
  };

  const dismiss = (n: AppNotification) => {
    setItems((prev) => prev.filter((x) => x._id !== n._id));
    if (!n.readAt) setUnreadCount(unread - 1);
    notificationApi.remove(n._id).catch(recover);
  };

  const markAll = () => {
    const now = new Date().toISOString();
    setItems((prev) => (tab === "unread" ? [] : prev.map((x) => ({ ...x, readAt: x.readAt ?? now }))));
    setUnreadCount(0);
    notificationApi.markAllRead().catch(recover);
  };

  const badge = unread > 99 ? "99+" : String(unread);
  const firstLoad = loading && items.length === 0;
  const empty = !loading && failed !== "first" && items.length === 0;

  // Day headings only earn their space once there's more than one day to tell apart.
  const labels = items.map((n) => dayLabel(n.lastEventAt));
  const grouped = new Set(labels).size > 1;
  // A closing line only reads right after a list long enough to have scrolled.
  const showEnd = !cursor && !loading && !failed && items.length > 5;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${badge} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="button-notifications"
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
      >
        <Bell aria-hidden className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-background">
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute top-full right-0 z-50 mt-2 flex w-[calc(100vw-5rem)] max-w-[400px] origin-top-right flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-md)]"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
              {/* font-sans: headings default to the Heming display face (globals.css), which
                  nothing else in this panel or the navbar uses. */}
              <h2 className="font-sans text-sm font-semibold text-foreground">Notifications</h2>
              <button
                type="button"
                onClick={markAll}
                disabled={unread === 0}
                title="Mark all as read"
                className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-40"
              >
                <CheckCheck aria-hidden className="size-3.5" />
                Mark all read
              </button>
            </div>

            <div role="tablist" aria-label="Filter notifications" className="flex items-center gap-1.5 border-b border-border px-5 pb-3">
              {(["all", "unread"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => switchTab(t)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
                    tab === t
                      ? "border-border bg-muted text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                  {t === "unread" && unread > 0 && (
                    <span className="text-muted-foreground tabular-nums">{badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div
              ref={scrollRef}
              onKeyDown={onListKeyDown}
              className="max-h-[min(70vh,480px)] overflow-y-auto overscroll-contain"
            >
              {firstLoad && <RowSkeletons rows={3} />}

              {failed === "first" && (
                <Notice
                  icon={BellOff}
                  title="Couldn’t load notifications"
                  body="Check your connection and try again."
                  action={{ label: "Try again", onClick: () => reset(tab) }}
                />
              )}

              {empty && tab === "all" && (
                <Notice
                  icon={BellOff}
                  title="No notifications yet"
                  body="Likes, comments and replies on your posts will show up here."
                />
              )}
              {empty && tab === "unread" && (
                <Notice icon={CircleCheck} title="You’re all caught up" body="Nothing new since you last looked." />
              )}

              {items.length > 0 && (
                <ul>
                  {items.map((n, i) => (
                    <Fragment key={n._id}>
                      {grouped && labels[i] !== labels[i - 1] && (
                        <li
                          aria-hidden
                          className="sticky top-0 z-10 border-y border-border bg-card/95 px-5 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase backdrop-blur first:border-t-0"
                        >
                          {labels[i]}
                        </li>
                      )}
                      <NotificationItem n={n} onOpen={openItem} onMarkRead={markRead} onDismiss={dismiss} />
                    </Fragment>
                  ))}
                </ul>
              )}

              {/* Sentinel sits a little inside the end of the list so the next page is
                  already loading by the time you reach it. */}
              <div ref={sentinelRef} aria-hidden className="h-px" />

              {loadingMore && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground" role="status">
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  Loading more
                </div>
              )}

              {failed === "more" && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  Couldn’t load more.
                  <button
                    type="button"
                    onClick={() => cursor && void load(tab, cursor)}
                    className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {showEnd && (
                <p className="py-4 text-center text-xs text-muted-foreground">You’ve reached the end.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
