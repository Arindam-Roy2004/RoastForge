"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/store/auth";

export default function Footer() {
  const { user } = useAuth();
  const hideCandidateLinks = user?.role === "recruiter";
  return (
    <footer className="border-t-[3px] border-border bg-card mt-auto">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-12 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="space-y-5 lg:max-w-md shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-3 group w-fit"
              data-testid="footer-brand"
            >
              <div
                className="size-10 shrink-0 bg-primary rounded-full border-[3px] border-border flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all"
                aria-hidden
              >
                <Flame className="size-5 text-primary-foreground" strokeWidth={2.25} />
              </div>
              <span className="font-heading text-2xl sm:text-[1.75rem] tracking-tighter text-foreground leading-none h-10 inline-flex items-center">
                RoastForge
              </span>
            </Link>
            <p className="text-base text-muted-foreground leading-relaxed">
              The only resume feedback platform that tells you what your friends are too polite to say.
            </p>
          </div>

          <nav
            className="flex flex-col gap-10 sm:flex-row sm:gap-0 lg:ml-auto"
            aria-label="Footer navigation"
          >
            <div className="sm:min-w-50 sm:border-r-2 sm:border-border sm:pr-10 md:pr-12">
              <h3 className="font-heading text-foreground text-xs uppercase tracking-[0.2em] mb-1">
                Explore
              </h3>
              <div className="h-0.5 w-16 bg-primary/80 mb-4 rounded-full" aria-hidden />
              <ul className="flex flex-col gap-0.5 text-sm sm:text-base font-medium">
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

            <div className="sm:min-w-50 sm:pl-10 md:pl-12">
              <h3 className="font-heading text-foreground text-xs uppercase tracking-[0.2em] mb-1">
                Account
              </h3>
              <div className="h-0.5 w-16 bg-primary/80 mb-4 rounded-full" aria-hidden />
              <ul className="flex flex-col gap-0.5 text-sm sm:text-base font-medium">
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

        <div className="border-t-[3px] border-border mt-16 pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-8 shrink-0 rounded-full border-2 border-border bg-destructive/15 flex items-center justify-center"
              aria-hidden
            >
              <Flame className="size-4 text-destructive" strokeWidth={2.25} />
            </div>
            <span className="leading-snug">
              <span className="text-foreground font-heading tracking-tight">RoastForge</span>
              {" — "}
              Forging better careers through brutal honesty.
            </span>
          </div>
          <span className="leading-snug md:text-right shrink-0">
            Resumes are public. Feelings are not guaranteed.
          </span>
        </div>
      </div>
    </footer>
  );
}
