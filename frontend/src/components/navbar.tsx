"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/store/theme";
import { Moon, Sun } from "lucide-react";
import FlameIcon from "@/components/icons/flame-icon";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const router = useRouter();
  const isAuthenticated = !!user;
  const isDark = mounted && theme === "dark";

  return (
    <nav className="sticky top-0 z-50 w-full border-b-[3px] border-border bg-card">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-2 sm:min-h-[4.25rem] sm:px-6 sm:py-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-3 shrink-0 py-1"
          data-testid="link-home"
        >
          <FlameIcon
            size={20}
            className="shrink-0 text-primary"
            strokeWidth={2.25}
            aria-hidden
          />
          <span className="inline-flex h-10 items-center font-heading text-xl leading-none tracking-tight text-foreground sm:text-[1.35rem]">
            RoastForge
          </span>
        </Link>

        <div className="flex min-h-10 items-center gap-1 overflow-x-auto sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
            aria-pressed={mounted ? isDark : undefined}
            suppressHydrationWarning
            data-testid="button-theme-toggle"
            className="relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-none border-2 border-border bg-card text-foreground shadow-[var(--shadow-xs)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <Link href="/" className="rounded-none border-[3px] border-transparent px-3 py-2 text-xs font-heading uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground sm:py-2.5" data-testid="link-browse">Browse</Link>
          
          {isAuthenticated ? (
            <>
              {user?.role !== "recruiter" && (
                <>
                  <Link href="/upload" className="rounded-none border-[3px] border-transparent px-3 py-2 text-xs font-heading uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground sm:py-2.5" data-testid="link-upload">Upload</Link>
                  <Link href="/projects" className="rounded-none border-[3px] border-transparent px-3 py-2 text-xs font-heading uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground sm:py-2.5" data-testid="link-projects">Projects</Link>
                </>
              )}
              <Link href="/profile" className="rounded-none border-[3px] border-transparent px-3 py-2 text-xs font-heading uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground sm:py-2.5" data-testid="link-profile">Profile</Link>
              {user?.role === "recruiter" && (
                <Link href="/recruiter" className="rounded-none border-[3px] border-transparent px-3 py-2 text-xs font-heading uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-primary/20 hover:text-foreground sm:py-2.5" data-testid="link-recruiter">Dashboard</Link>
              )}
              <Button 
                variant="outline" 
                size="sm"
                className="ml-1 h-9 rounded-none border-[3px] border-border px-3.5 font-heading text-[11px] uppercase tracking-wider shadow-[var(--shadow-2xs)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                onClick={async () => {
                  try { await logout(); } catch {}
                  router.push("/login");
                }}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                data-testid="link-login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-9 rounded-none border-[3px] border-border px-3.5 font-heading text-[11px] uppercase tracking-wider shadow-[var(--shadow-2xs)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
                )}
              >
                Login
              </Link>
              <Link
                href="/register"
                data-testid="link-register"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "h-9 rounded-none border-[3px] border-border px-3.5 font-heading text-[11px] uppercase tracking-wider shadow-[var(--shadow-2xs)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
                )}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
