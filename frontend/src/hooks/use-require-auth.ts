"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import type { User } from "@/lib/api";

type RequireAuthState = {
  user: User | null;
  /**
   * True only while the session probe is in flight. Once it settles, a `null`
   * user means a redirect to /login has been scheduled — render a short
   * placeholder for that, not a loading skeleton.
   */
  loading: boolean;
};

/**
 * Gate for pages that make no sense without an account (/profile, /upload).
 *
 * These used to render an inline "Sign In Required" card, which left a signed-out
 * visitor parked on a URL they can't use. Sending them to /login instead — with
 * the page they wanted in `?next=` so sign-in returns them there — is both fewer
 * clicks and one less dead end to maintain.
 *
 * `router.replace` rather than `push` so Back doesn't bounce them straight into
 * the same redirect.
 */
export function useRequireAuth(): RequireAuthState {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for the session probe to finish — redirecting during `loading` would
    // kick out signed-in users on every hard refresh.
    if (loading || user) return;
    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [loading, user, pathname, router]);

  return { user, loading };
}
