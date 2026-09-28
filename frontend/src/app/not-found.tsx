import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RoastHubChrome } from "@/components/roasthub-chrome";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 must never be indexed as a real page.
  robots: { index: false, follow: false },
};

/**
 * App-wide 404. A root `not-found` renders outside the `(roasthub)` route group,
 * so it wraps itself in the same chrome — without that, a mistyped URL landed on
 * a bare page with no navbar and no way back except the browser's Back button.
 *
 * Layout follows shadcn's Empty pattern: icon tile, title, one line, one action.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <RoastHubChrome>
        <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-24 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <FileQuestion aria-hidden className="size-6 text-foreground" />
          </span>
          <div className="space-y-2">
            <p className="font-mono text-xs text-muted-foreground">404</p>
            <h1 className="font-sans text-2xl font-semibold tracking-tight">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              This page doesn&apos;t exist, or it was moved or deleted.
            </p>
          </div>
          <Link
            href="/"
            className={cn(
              buttonVariants(),
              "rounded-lg font-sans text-sm font-medium tracking-normal normal-case !shadow-none hover:translate-y-0",
            )}
          >
            Back to home
          </Link>
        </div>
      </RoastHubChrome>
    </div>
  );
}
