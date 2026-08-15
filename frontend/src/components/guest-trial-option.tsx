import Link from "next/link";
import { UserRound } from "lucide-react";
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
 * Shared by both auth pages (via AuthShell) so the two can't drift apart.
 */

/**
 * Aceternity's bottom-edge glow, as used on easter.chat's GitHub and Google
 * buttons: two thin lines fade in just *outside* the bottom edge on hover —
 * an upper sharp line and a lower, wider, blurred one. Dark mode only; a glow
 * needs a dark surface to read against, so on light it's simply absent.
 *
 * This must render inside a wrapper that is `relative` but NOT
 * `overflow-hidden` — the lines sit at `-bottom-px`, just outside the box,
 * and would be clipped away. That's why it's a *sibling* of the clipped
 * content in both call sites below, not a child of it.
 */
export function BottomGradient() {
  return (
    <>
      <span className="pointer-events-none absolute inset-x-0 -bottom-px hidden h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100 dark:block" />
      <span className="pointer-events-none absolute inset-x-10 -bottom-px mx-auto hidden h-px w-1/2 bg-gradient-to-r from-transparent via-primary-strong to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100 dark:block" />
    </>
  );
}

/**
 * The auth card's action-bar surface, built on this project's own dark-mode
 * tokens (`--secondary` fill) instead of a hardcoded near-black hex — so in
 * dark mode it sits at the same depth as every other raised control in the
 * app, rather than reading as a separate, heavier black. Light mode is the
 * plain `--border` line with no fill change and no glow.
 */
export const authBarClass = cn(
  "group/btn relative flex h-10 w-full items-center justify-center gap-2 rounded-md",
  "border border-border bg-background text-sm font-medium text-foreground transition-colors",
  "focus-visible:outline-none focus-visible:border-foreground/40",
  "dark:bg-secondary dark:hover:bg-secondary/70",
  "[&>svg]:size-4 [&>svg]:shrink-0",
);

export function GuestTrialOption({ className }: { className?: string }) {
  return (
    <div className={cn("mt-6", className)}>
      <div aria-hidden className="divider-gradient mb-6 h-px w-full" />

      {/* The glow wrapper is `relative` but not clipped, so BottomGradient can
          paint just past its bottom edge. The Link inside it carries its own
          `overflow-hidden` (via authBarClass) so the bar's rounded corners
          stay clean regardless. */}
      <div className="group/btn relative">
        <Link href="/try" data-testid="link-guest-try" className={cn(authBarClass, "overflow-hidden")}>
          <UserRound aria-hidden />
          Continue as guest
        </Link>
        <BottomGradient />
      </div>
    </div>
  );
}
