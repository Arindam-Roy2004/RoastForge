import { Flame } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t-4 border-border bg-card mt-auto">
      <div className="container mx-auto px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="w-8 h-8 text-primary" />
              <span className="font-heading text-2xl tracking-tight">RoastForge</span>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
              The only resume feedback platform that tells you what your friends are too polite to say.
            </p>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h3 className="font-heading uppercase text-base tracking-widest text-foreground">Explore</h3>
            <ul className="space-y-4 text-base">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-home">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-browse">
                  Browse Roasts
                </Link>
              </li>
              <li>
                <Link href="/upload" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-upload">
                  Upload Resume
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h3 className="font-heading uppercase text-base tracking-widest text-foreground">Account</h3>
            <ul className="space-y-4 text-base">
              <li>
                <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-profile">
                  My Profile
                </Link>
              </li>
              <li>
                <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-projects">
                  My Projects
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-login">
                  Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t-2 border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
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
