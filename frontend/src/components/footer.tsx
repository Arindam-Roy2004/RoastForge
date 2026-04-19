"use client";

import Link from "next/link";
import { useAuth } from "@/store/auth";
import FlameIcon from "@/components/icons/flame-icon";
import BugIcon from "@/components/icons/bug-icon";

export default function Footer() {
  const { user } = useAuth();
  const isRecruiter = user?.role === "recruiter";

  return (
    <footer className="mt-auto w-full border-t-[3px] border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-6">
          {/* Left: Brand + tagline */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 shrink-0"
              data-testid="footer-brand"
            >
              <FlameIcon size={18} className="shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
              <span className="font-heading text-lg tracking-tighter text-foreground leading-none">
                RoastForge
              </span>
            </Link>
            <p className="text-xs text-muted-foreground">
              Get your resume brutally roasted.
            </p>
          </div>

          {/* Center: Nav links */}
          <nav className="flex items-center gap-1 flex-wrap justify-center" aria-label="Footer navigation">
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              data-testid="footer-link-home"
            >
              Browse
            </Link>
            {isRecruiter ? (
              <Link
                href="/recruiter"
                className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                data-testid="footer-link-recruiter"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/upload"
                className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                data-testid="footer-link-upload"
              >
                Upload
              </Link>
            )}
            <Link
              href="/profile"
              className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              data-testid="footer-link-profile"
            >
              Profile
            </Link>
          </nav>

          {/* Right: Report bug */}
          <div className="flex items-center">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdIqU2QCmm7VMje1JWvpOm39tDHXv4QcwDvGzI9j1U54vcGYA/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all bg-background"
              data-testid="footer-link-report-bug"
            >
              <BugIcon size={13} strokeWidth={2.25} className="shrink-0" />
              Report Bug
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 py-3 text-center">
          <p className="text-[10px] text-muted-foreground/70 tracking-wide">
            &copy; {new Date().getFullYear()} RoastForge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
