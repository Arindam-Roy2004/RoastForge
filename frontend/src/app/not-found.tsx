import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RoastHubChrome } from "@/components/roasthub-chrome";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 must never be indexed as a real page.
  robots: { index: false, follow: false },
};

/**
 * App-wide 404, in the shadcn "large numeral" pattern: an oversized 404 as the
 * visual anchor, a heading, one line, and a single way home — centred in the
 * space between navbar and footer rather than floating near the top.
 *
 * A root `not-found` renders outside the `(roasthub)` route group, so it wraps
 * itself in the same chrome to keep the navbar and footer.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <RoastHubChrome>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          {/* Decorative; the heading carries the meaning for screen readers. */}
          <p
            aria-hidden
            className="font-sans text-8xl leading-none font-semibold tracking-tighter text-foreground/10 select-none sm:text-9xl"
          >
            404
          </p>
          <h1 className="mt-6 font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
            Page not found
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 rounded-lg font-sans text-sm font-medium tracking-normal normal-case !shadow-none hover:translate-y-0",
            )}
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to home
          </Link>
        </div>
      </RoastHubChrome>
    </div>
  );
}
