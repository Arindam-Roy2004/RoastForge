"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/store/theme";
import { Moon, Sun } from "lucide-react";
import FlameIcon from "@/components/icons/flame-icon";
import { cn } from "@/lib/utils";

const NAV_LINK =
  "label-mono rounded-md px-3 py-2 text-[0.6875rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const router = useRouter();
  const isAuthenticated = !!user;
  const isDark = mounted && theme === "dark";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-app flex h-16 items-center gap-4 sm:gap-6">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5"
          data-testid="link-home"
        >
          <FlameIcon
            size={20}
            className="shrink-0 text-primary-strong"
            strokeWidth={2.25}
            aria-hidden
          />
          <span className="label-mono text-sm leading-none text-foreground">
            RoastForge
          </span>
        </Link>

        {/* Primary navigation — sits next to the wordmark, like Vercel/Autosend.
            Scrolls horizontally on narrow screens rather than disappearing. */}
        <nav
          aria-label="Main navigation"
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Anchored at the gallery rather than "/" so it also does something
              when you're already on the home page (where the hero fills the
              viewport and the gallery sits below the fold). */}
          <Link href="/#hall-of-shame" className={NAV_LINK} data-testid="link-browse">Browse</Link>
          {isAuthenticated && (
            <>
              {user?.role !== "recruiter" && (
                <>
                  <Link href="/upload" className={NAV_LINK} data-testid="link-upload">Upload</Link>
                  <Link href="/projects" className={NAV_LINK} data-testid="link-projects">Projects</Link>
                </>
              )}
              <Link href="/profile" className={NAV_LINK} data-testid="link-profile">Profile</Link>
              {user?.role === "recruiter" && (
                <Link href="/recruiter" className={NAV_LINK} data-testid="link-recruiter">Dashboard</Link>
              )}
            </>
          )}
        </nav>

        {/* Account actions, pinned to the right edge and separated by a rule. */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
            aria-pressed={mounted ? isDark : undefined}
            suppressHydrationWarning
            data-testid="button-theme-toggle"
            className="relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
          >
            <Sun
              className="absolute size-[18px] rotate-0 scale-100 opacity-100 transition-all dark:rotate-90 dark:scale-0 dark:opacity-0"
              strokeWidth={2.25}
              aria-hidden
            />
            <Moon
              className="absolute size-[18px] -rotate-90 scale-0 opacity-0 transition-all dark:rotate-0 dark:scale-100 dark:opacity-100"
              strokeWidth={2.25}
              aria-hidden
            />
          </button>

          <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />

          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try { await logout(); } catch {}
                router.push("/login");
              }}
              data-testid="button-logout"
            >
              Logout
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                data-testid="link-login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Login
              </Link>
              <Link
                href="/register"
                data-testid="link-register"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
