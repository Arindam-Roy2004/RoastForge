import Link from "next/link";
import { UserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The "look around without an account" escape hatch, shown beneath the Google
 * button on /login and /register.
 *
 * It lives here rather than in the navbar because that's not the moment the
 * choice matters: someone browsing has no decision to make, while someone
 * staring at a sign-in wall does. Secondary styling keeps it from competing
 * with sign-in; the /try page itself states the limits, so this stays a button
 * and nothing more.
 *
 * Shared by both auth pages so the two can't drift apart.
 */
export function GuestTrialOption({ className }: { className?: string }) {
  return (
    <div className={cn("mt-7 w-full max-w-[280px]", className)}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="label-mono text-[0.625rem] text-muted-foreground">or</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      <Link
        href="/try"
        data-testid="link-guest-try"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "mt-4 h-10 w-full rounded-lg",
        )}
      >
        <UserRound aria-hidden />
        Continue as guest
      </Link>
    </div>
  );
}
