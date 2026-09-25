"use client";

import Link from "next/link";
import { useAuth } from "@/store/auth";
import FlameIcon from "@/components/icons/flame-icon";
import BugIcon from "@/components/icons/bug-icon";
import { cn } from "@/lib/utils";

/**
 * Footer links at `text-sm` sentence case, not 11px uppercase mono.
 *
 * The whole footer was previously set in `label-mono` at 10–11px, which reads as
 * fine print rather than navigation — the links ended up smaller than every
 * other piece of text on the page and had to be deciphered rather than scanned.
 * `text-sm` body sans is what the reference, Vercel and shadcn all use here, and
 * it matches the navbar's own links so the two ends of the page agree.
 */
const linkCls =
  "rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45";

export default function Footer() {
  const { user } = useAuth();
  const isRecruiter = user?.role === "recruiter";

  return (
    // `hairline` rather than `border-border`: this rule spans the full width of
    // the page, and `--border` is the near-black component ink, which made the
    // footer's top edge read as a hard slab. Same quiet divide the navbar uses.
    <footer className="hairline mt-20 w-full border-t bg-card">
      <div className="container-app">
        {/* Upper: brand block left, links inline on the same row */}
        <div className="flex flex-col gap-8 py-9 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
          <div className="max-w-sm space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              data-testid="footer-brand"
            >
              <FlameIcon
                size={18}
                className="shrink-0 text-primary-strong"
                strokeWidth={2.25}
                aria-hidden
              />
              {/* Matches the navbar wordmark so the same brand isn't set two
                  different ways at the top and bottom of the page. */}
              <span className="text-base leading-none font-medium tracking-tight text-foreground">
                RoastForge
              </span>
            </Link>
            {/* `text-pretty` stops the last word dropping to a line of its own,
                which is what left "else." orphaned at this measure. */}
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              Get your resume brutally roasted — by AI, and by everyone else.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex items-center gap-5 sm:gap-7"
          >
            {/* Was `text-muted-foreground/60` — dimming an already-muted token
                pushed this under the contrast floor for no gain. */}
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Navigate
            </span>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <li>
                {isRecruiter ? (
                  <Link
                    href="/recruiter"
                    className={linkCls}
                    data-testid="footer-link-recruiter"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/upload"
                    className={linkCls}
                    data-testid="footer-link-upload"
                  >
                    Upload
                  </Link>
                )}
              </li>
              <li>
                <Link
                  href="/profile"
                  className={linkCls}
                  data-testid="footer-link-profile"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Lower: copyright left, utility right */}
        <div className="hairline flex flex-col items-center justify-between gap-3 border-t py-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RoastForge
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdIqU2QCmm7VMje1JWvpOm39tDHXv4QcwDvGzI9j1U54vcGYA/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkCls, "inline-flex items-center gap-1.5")}
            data-testid="footer-link-report-bug"
          >
            <BugIcon size={14} strokeWidth={2.25} className="shrink-0" aria-hidden />
            Report Bug
          </a>
        </div>
      </div>
    </footer>
  );
}
