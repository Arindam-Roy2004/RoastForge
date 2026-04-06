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
    <nav className="border-b-4 border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home">
          <Flame className="w-8 h-8 text-primary" />
          <span className="font-heading text-xl tracking-tight">RoastForge</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-browse">Browse</Link>
          
          {isAuthenticated ? (
            <>
              <Link href="/upload" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-upload">Upload</Link>
              <Link href="/projects" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-projects">Projects</Link>
              <Link href="/profile" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-profile">Profile</Link>
              {user?.role === "recruiter" && (
                <Link href="/recruiter" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-recruiter">Dashboard</Link>
              )}
              <Button 
                variant="outline" 
                className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
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
                <Button variant="outline" className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none">Login</Button>
              </Link>
              <Link href="/register" data-testid="link-register">
                <Button className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
