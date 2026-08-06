"use client";

import { useEffect } from "react";

/**
 * Scrolls to `window.location.hash` once the page's async content has landed.
 *
 * Why this is needed at all: the browser (and Next's router) resolves a hash the
 * moment the document is interactive. On a page whose main content arrives from
 * a fetch, that's too early — the target either isn't mounted yet, or it is but
 * sits at the wrong offset because the loading skeletons are shorter than the
 * real rows. Either way the jump silently no-ops or lands short, which is why
 * `/#hall-of-shame` appeared to do nothing. Re-running the scroll after `ready`
 * flips fixes both cases.
 *
 * Also listens for `hashchange`, so following an in-page link still scrolls when
 * the document is already loaded.
 *
 * `scrollIntoView` honours the target's `scroll-margin-top`, so a sticky header
 * offset stays a CSS concern (see `scroll-mt-*` on the target).
 *
 * @param ready pass `false` while the page is still fetching its content.
 */
export function useHashScroll(ready: boolean) {
  useEffect(() => {
    if (!ready) return;

    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [ready]);
}
