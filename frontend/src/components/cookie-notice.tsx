"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "roastforge.cookie-notice";

/**
 * Cookie notice. A *notice*, not a consent gate, and deliberately so: the only
 * cookie is the HttpOnly sign-in cookie, which is strictly necessary, and
 * Vercel Analytics is cookieless. There is nothing optional to accept or
 * reject, so an Accept/Reject pair would imply a choice that changes nothing.
 * If a non-essential cookie or tracker is ever added, this must become a real
 * opt-in that blocks it until accepted.
 *
 * Dismissal is read through `useSyncExternalStore` rather than set in an effect,
 * so there is no hydration mismatch and no flash: the server snapshot says
 * "dismissed" (render nothing), and the client shows the notice only if it
 * genuinely hasn't been dismissed on this device.
 */
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Keep other open tabs in sync when one dismisses it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Storage blocked (private mode, strict settings): don't nag on every page.
    return true;
  }
}

export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage blocked; the notice just returns next visit */
    }
    listeners.forEach((l) => l());
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      // `env(safe-area-inset-bottom)` keeps it clear of the iPhone home
      // indicator; max() keeps the normal 1rem gap everywhere else.
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-lg)] sm:items-center"
    >
      <Cookie aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground sm:mt-0" />
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
        We only use a cookie to keep you signed in. No tracking.{" "}
        <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4">
          Privacy policy
        </Link>
      </p>
      <Button
        size="sm"
        onClick={dismiss}
        className="shrink-0 rounded-lg font-sans text-sm font-medium tracking-normal normal-case !shadow-none hover:translate-y-0"
      >
        Got it
      </Button>
    </div>
  );
}
