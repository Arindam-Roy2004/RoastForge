import { Flame } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t-4 border-border bg-card mt-auto">
      <div className="container mx-auto px-6 py-12 lg:px-8 max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="space-y-5 lg:max-w-md shrink-0">
            <div className="flex items-center gap-2">
              <Flame className="w-8 h-8 text-primary" />
              <span className="font-heading text-2xl tracking-tight text-foreground">RoastForge</span>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">
              The only resume feedback platform that tells you what your friends are too polite to say.
            </p>
          </div>

          <nav
            className="flex flex-col gap-10 sm:flex-row sm:gap-0 lg:ml-auto"
            aria-label="Footer navigation"
          >
            <div className="sm:min-w-[12.5rem] sm:border-r-2 sm:border-border sm:pr-10 md:pr-12">
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
                <li>
                  <Link
                    href="/upload"
                    className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                    data-testid="footer-link-upload"
                  >
                    Upload Resume
                  </Link>
                </li>
              </ul>
            </div>

            <div className="sm:min-w-[12.5rem] sm:pl-10 md:pl-12">
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
                <li>
                  <Link
                    href="/projects"
                    className="block w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm -mx-1 px-1 hover:bg-muted/60"
                    data-testid="footer-link-projects"
                  >
                    My Projects
                  </Link>
                </li>
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

        <div className="border-t-2 border-border mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" />
            <span>RoastForge — Forging better careers through brutal honesty.</span>
          </div>
          <span>Resumes are public. Feelings are not guaranteed.</span>
        </div>
      </div>
    </footer>
  );
}
