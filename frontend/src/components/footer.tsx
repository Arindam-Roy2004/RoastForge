"use client";

import Link from "next/link";
import { useAuth } from "@/store/auth";
import FlameIcon from "@/components/icons/flame-icon";
import BugIcon from "@/components/icons/bug-icon";

const linkCls =
  "label-mono text-[0.6875rem] text-muted-foreground transition-colors hover:text-foreground";

export default function Footer() {
  const { user } = useAuth();
  const isRecruiter = user?.role === "recruiter";

  return (
    <footer className="mt-20 w-full border-t border-border bg-card">
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
                size={16}
                className="shrink-0 text-primary-strong"
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="label-mono text-sm leading-none text-foreground">
                RoastForge
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Get your resume brutally roasted — by AI, and by everyone else.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex items-center gap-5 sm:gap-7"
          >
            <span className="label-mono hidden text-[0.625rem] text-muted-foreground/60 sm:inline">
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
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border py-5 sm:flex-row">
          <p className="label-mono text-[0.625rem] text-muted-foreground/70">
            &copy; {new Date().getFullYear()} RoastForge
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdIqU2QCmm7VMje1JWvpOm39tDHXv4QcwDvGzI9j1U54vcGYA/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="label-mono inline-flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground transition-colors hover:text-foreground"
            data-testid="footer-link-report-bug"
          >
            <BugIcon size={13} strokeWidth={2.25} className="shrink-0" />
            Report Bug
          </a>
        </div>
      </div>
    </footer>
  );
}
