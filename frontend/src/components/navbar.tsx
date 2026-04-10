"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/auth";
import { Flame } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isAuthenticated = !!user;

  return (
    <nav className="border-b-[3px] border-border bg-card sticky top-0 z-50 shadow-[0_2px_0_0_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group shrink-0"
          data-testid="link-home"
        >
          <div
            className="size-8 shrink-0 bg-primary rounded-full border-[3px] border-border flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all"
            aria-hidden
          >
            <Flame className="size-4 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <span className="font-heading text-lg tracking-tight leading-none text-foreground h-8 inline-flex items-center">
            RoastForge
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <Link href="/" className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted border-[3px] border-transparent hover:border-border transition-all" data-testid="link-browse">Browse</Link>
          
          {isAuthenticated ? (
            <>
              {user?.role !== "recruiter" && (
                <>
                  <Link href="/upload" className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted border-[3px] border-transparent hover:border-border transition-all" data-testid="link-upload">Upload</Link>
                  <Link href="/projects" className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted border-[3px] border-transparent hover:border-border transition-all" data-testid="link-projects">Projects</Link>
                </>
              )}
              <Link href="/profile" className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted border-[3px] border-transparent hover:border-border transition-all" data-testid="link-profile">Profile</Link>
              {user?.role === "recruiter" && (
                <Link href="/recruiter" className="px-3 py-1.5 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-primary/20 border-[3px] border-transparent hover:border-border transition-all" data-testid="link-recruiter">Dashboard</Link>
              )}
              <Button 
                variant="outline" 
                size="sm"
                className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-[10px] tracking-wider h-8 px-3 ml-1"
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
                <Button variant="outline" size="sm" className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-[10px] tracking-wider h-8 px-3">Login</Button>
              </Link>
              <Link href="/register" data-testid="link-register">
                <Button size="sm" className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-[10px] tracking-wider h-8 px-3">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
