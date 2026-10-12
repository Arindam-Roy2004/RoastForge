"use client";

import { useEffect, useSyncExternalStore } from "react";
import { notificationApi } from "@/lib/api";

/**
 * Unread-notification count, shared by every bell on the page.
 *
 * The navbar renders its content twice (resting bar and floating pill), so a
 * per-component poll would double the traffic. This is one module-level store:
 * the first mounted consumer starts a single timer, the last one stops it.
 * Polling skips ticks while the tab is hidden and refetches on return.
 */

const POLL_MS = 30_000;

let count = 0;
let consumers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setUnreadCount(next: number) {
  const clamped = Math.max(0, next);
  if (clamped === count) return;
  count = clamped;
  emit();
}

export async function refreshUnreadCount() {
  try {
    const res = await notificationApi.unreadCount();
    setUnreadCount(res.data?.count ?? 0);
  } catch {
    // A failed poll keeps the last known value; the next tick retries.
  }
}

function onVisibility() {
  if (document.visibilityState === "visible") void refreshUnreadCount();
}

function start() {
  void refreshUnreadCount();
  timer = setInterval(() => {
    if (document.visibilityState === "visible") void refreshUnreadCount();
  }, POLL_MS);
  document.addEventListener("visibilitychange", onVisibility);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisibility);
  // Don't leak one account's badge into the next (logout → login).
  setUnreadCount(0);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Live unread count. Pass `enabled=false` while signed out to keep it idle. */
export function useUnreadCount(enabled: boolean): number {
  useEffect(() => {
    if (!enabled) return;
    consumers += 1;
    if (consumers === 1) start();
    return () => {
      consumers -= 1;
      if (consumers === 0) stop();
    };
  }, [enabled]);

  return useSyncExternalStore(subscribe, () => count, () => 0);
}
