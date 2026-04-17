"use client";

import Link from "next/link";
import { useAuth } from "@/store/auth";
import FlameIcon from "@/components/icons/flame-icon";
import BugIcon from "@/components/icons/bug-icon";

export default function Footer() {
  const { user } = useAuth();
  const hideCandidateLinks = user?.role === "recruiter";
  return (
    <footer className="mt-auto w-full border-t-[3px] border-border bg-card">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="shrink-0 space-y-3 lg:max-w-sm">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2.5"
              data-testid="footer-brand"
            >
              <FlameIcon
                size={20}
                className="shrink-0 text-primary"
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="inline-flex h-9 items-center font-heading text-xl tracking-tighter text-foreground leading-none">
                RoastForge
              </span>
            </Link>
            <p className="text-sm leading-snug text-muted-foreground">
              Resume feedback without the sugar-coating.
            </p>
            <div className="pt-1">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdIqU2QCmm7VMje1JWvpOm39tDHXv4QcwDvGzI9j1U54vcGYA/viewform?usp=publish-editor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="footer-link-report-bug"
              >
                <BugIcon size={16} strokeWidth={2.25} className="shrink-0" />
                Report Bug
              </a>
            </div>
          </div>

          <nav
            className="flex flex-col gap-8 sm:flex-row sm:gap-0 lg:ml-auto"
            aria-label="Footer navigation"
          >
            <div className="sm:min-w-44 sm:border-r-2 sm:border-border sm:pr-8 md:pr-10">
              <h3 className="mb-1 font-heading text-xs uppercase tracking-[0.18em] text-foreground">
                Explore
              </h3>
              <div className="mb-3 h-0.5 w-12 rounded-full bg-primary/80" aria-hidden />
              <ul className="flex flex-col gap-0.5 text-sm font-medium">
                <li>
                  <Link
                    href="/"
                    className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                    data-testid="footer-link-home"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/"
                    className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                    data-testid="footer-link-browse"
                  >
                    Browse Roasts
                  </Link>
                </li>
                {hideCandidateLinks && (
                  <li>
                    <Link
                      href="/recruiter"
                      className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                      data-testid="footer-link-recruiter"
                    >
                      Recruiter dashboard
                    </Link>
                  </li>
                )}
                {!hideCandidateLinks && (
                  <li>
                    <Link
                      href="/upload"
                      className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                      data-testid="footer-link-upload"
                    >
                      Upload Resume
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="sm:min-w-44 sm:pl-8 md:pl-10">
              <h3 className="mb-1 font-heading text-xs uppercase tracking-[0.18em] text-foreground">
                Account
              </h3>
              <div className="mb-3 h-0.5 w-12 rounded-full bg-primary/80" aria-hidden />
              <ul className="flex flex-col gap-0.5 text-sm font-medium">
                <li>
                  <Link
                    href="/profile"
                    className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                    data-testid="footer-link-profile"
                  >
                    My Profile
                  </Link>
                </li>
                {!hideCandidateLinks && (
                  <li>
                    <Link
                      href="/projects"
                      className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                      data-testid="footer-link-projects"
                    >
                      My Projects
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/login"
                    className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                    data-testid="footer-link-login"
                  >
                    Login
                  </Link>
                </li>
              </ul>
            </div>

          </nav>
        </div>
      </div>
    </footer>
  );
}
