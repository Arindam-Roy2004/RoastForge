"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/auth";
import { Flame } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isAuthenticated = !!user;

  return (
    <nav className="sticky top-0 z-50 w-full border-b-[3px] border-border bg-card">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-2 sm:min-h-[4.25rem] sm:py-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-3 group shrink-0 py-1"
          data-testid="link-home"
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-border bg-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none sm:size-11"
            aria-hidden
          >
            <Flame className="size-[1.125rem] text-primary-foreground sm:size-5" strokeWidth={2.25} />
          </div>
          <span className="inline-flex h-10 items-center font-heading text-xl leading-none tracking-tight text-foreground sm:text-[1.35rem]">
            RoastForge
          </span>
        </Link>

        <div className="flex min-h-10 items-center gap-1 overflow-x-auto sm:gap-2">
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
                className="ml-1 h-9 rounded-none border-[3px] border-border px-3.5 font-heading text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
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
              <Link href="/login" data-testid="link-login">
                <Button variant="outline" size="sm" className="h-9 rounded-none border-[3px] border-border px-3.5 font-heading text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">Login</Button>
              </Link>
              <Link href="/register" data-testid="link-register">
                <Button size="sm" className="h-9 rounded-none border-[3px] border-border px-3.5 font-heading text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
