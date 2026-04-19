"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import FlameIcon from "@/components/icons/flame-icon";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/store/auth";

/**
 * Sign-in page. Google is the only auth method — first-time Google users are
 * routed onward to /onboarding/role to pick Candidate or Recruiter; returning
 * users go straight to the gallery.
 */
export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onGoogleSuccess(res: CredentialResponse) {
    if (!res.credential) {
      toast.error("Google did not return a credential");
      return;
    }
    setBusy(true);
    try {
      const user = await signInWithGoogle(res.credential);
      toast.success("Welcome to RoastForge");
      router.push(user.onboardingCompleted === false ? "/onboarding/role" : "/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
      {/* Outer wrapper — no hover translate on page-level cards */}
      <div className="w-full max-w-4xl border-[3px] border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-card">
        <div className="grid md:grid-cols-[1fr_1.2fr] min-h-[480px]">
          {/* Left — illustration panel */}
          <div className="hidden md:flex flex-col items-center justify-center bg-accent/30 border-r-[3px] border-border px-10 py-14 gap-8">
            <img
              src="https://api.dicebear.com/9.x/fun-emoji/svg?seed=roastforge-login&size=200"
              alt=""
              className="w-36 h-36"
            />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-heading font-bold tracking-tighter text-foreground">
                Welcome Back
              </h2>
              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                Resume feedback without the sugar-coating. Sign in to continue your journey.
              </p>
            </div>
            {/* Tab switcher */}
            <div className="flex items-center border-[3px] border-border bg-background">
              <Link
                href="/register"
                className="px-5 py-2 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                data-testid="link-go-register-side"
              >
                Sign up
              </Link>
              <span className="px-5 py-2 text-xs font-heading uppercase tracking-wider bg-primary text-primary-foreground border-l-[3px] border-border">
                Sign in
              </span>
            </div>
          </div>

          {/* Right — form panel */}
          <div className="flex flex-col items-center justify-center px-8 py-14 sm:px-12">
            {/* Icon */}
            <div className="bg-primary w-14 h-14 flex items-center justify-center rounded-full border-[3px] border-border shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <FlameIcon size={28} className="text-primary-foreground" strokeWidth={2} />
            </div>

            {/* Heading */}
            <h1 className="mt-5 text-3xl font-heading font-bold uppercase tracking-tight text-foreground">
              Sign In
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              One tap with Google to continue.
            </p>

            {/* Google button */}
            <div
              className={`mt-8 transition-opacity ${busy ? "opacity-50 pointer-events-none" : ""}`}
              data-testid="google-login-slot"
            >
              <GoogleLogin
                onSuccess={onGoogleSuccess}
                onError={() => toast.error("Google sign-in was cancelled or failed")}
                theme="outline"
                shape="rectangular"
                size="large"
                text="continue_with"
                useOneTap={false}
              />
            </div>

            {/* Disclaimer */}
            <p className="mt-6 text-[10px] text-center text-muted-foreground/70 font-medium tracking-wide max-w-[280px]">
              We only use your Google name &amp; email. We never post on your behalf.
            </p>
          </div>
        </div>

        {/* Mobile footer — visible only on small screens */}
        <div className="flex justify-center border-t-[3px] border-border bg-muted/50 px-6 py-4 md:hidden">
          <p className="text-sm text-muted-foreground">
            New to RoastForge?{" "}
            <Link href="/register" className="font-heading text-primary hover:underline tracking-wider" data-testid="link-go-register">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
