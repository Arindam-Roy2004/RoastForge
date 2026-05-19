"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import FlameIcon from "@/components/icons/flame-icon";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/store/theme";
import { motion } from "framer-motion";

/**
 * Sign-up surface. Functionally identical to /login — both POST the same Google
 * ID token to /api/auth/google. The split exists for UX: users who think of
 * themselves as "new here" want a Sign Up button, users who think of themselves
 * as "returning" want Sign In. The backend doesn't care; the OnboardingGate
 * (and the explicit redirect below) routes first-timers through /onboarding/role.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const { theme, mounted } = useTheme();
  const [busy, setBusy] = useState(false);

  const isDark = mounted && theme === "dark";

  async function onGoogleSuccess(res: CredentialResponse) {
    if (!res.credential) {
      toast.error("Google did not return a credential");
      return;
    }
    setBusy(true);
    try {
      const user = await signInWithGoogle(res.credential);
      // Industry standard: brand-new sign-ups go straight into the role picker;
      // an existing Google account that happened to land on /register skips it.
      if (user.onboardingCompleted === false) {
        toast.success("Account created — pick your role");
        router.push("/onboarding/role");
      } else {
        toast.success("Welcome back");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12"
    >
      {/* Outer wrapper — no hover translate on page-level cards */}
      <div className="w-full max-w-4xl border-[3px] border-border rounded-none shadow-[var(--shadow-lg)] bg-card overflow-hidden">
        <div className="grid md:grid-cols-[1fr_1.2fr] min-h-[480px]">
          {/* Left — illustration panel */}
          <div className="hidden md:flex flex-col items-center justify-center bg-accent/30 border-r-[3px] border-border px-10 py-14 gap-8">
            <motion.img
              src="https://api.dicebear.com/9.x/bottts/svg?seed=roastforge-signup&size=200"
              alt=""
              className="w-36 h-36"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-heading font-bold tracking-tighter text-foreground">
                Start Your Journey
              </h2>
              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                Get your resume torn apart by AI and brutally honest peers. Improve before recruiters judge.
              </p>
            </div>
            {/* Tab switcher */}
            <div className="flex items-center border-[3px] border-border bg-background shadow-[var(--shadow-2xs)]">
              <span className="px-5 py-2 text-xs font-heading uppercase tracking-wider bg-primary text-primary-foreground border-r-[3px] border-border font-bold">
                Sign up
              </span>
              <Link
                href="/login"
                className="px-5 py-2 text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                data-testid="link-go-login-side"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Right — form panel */}
          <div className="flex flex-col items-center justify-center px-8 py-14 sm:px-12">
            {/* Icon */}
            <motion.div 
              whileHover={{ scale: 1.08, rotate: 5 }}
              className="bg-primary w-14 h-14 flex items-center justify-center rounded-full border-[3px] border-border shadow-[var(--shadow-xs)] cursor-pointer"
            >
              <FlameIcon size={28} className="text-primary-foreground" strokeWidth={2} />
            </motion.div>

            {/* Heading */}
            <h1 className="mt-5 text-3xl font-heading font-bold uppercase tracking-tight text-foreground">
              Join the Forge
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium text-center">
              One tap to create your account.
            </p>

            {/* Google button with smooth hover scale */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`mt-8 transition-all duration-200 ${busy ? "opacity-50 pointer-events-none" : ""}`}
              data-testid="google-signup-slot"
            >
              {mounted && (
                <GoogleLogin
                  onSuccess={onGoogleSuccess}
                  onError={() => toast.error("Google sign-up was cancelled or failed")}
                  theme={isDark ? "filled_black" : "outline"}
                  shape="rectangular"
                  size="large"
                  text="signup_with"
                  useOneTap={false}
                />
              )}
            </motion.div>

            {/* Disclaimer */}
            <p className="mt-6 text-[10px] text-center text-muted-foreground/70 font-medium tracking-wide max-w-[280px]">
              We only use your Google name &amp; email. We never post on your behalf.
            </p>
          </div>
        </div>

        {/* Mobile footer — visible only on small screens */}
        <div className="flex justify-center border-t-[3px] border-border bg-muted/50 px-6 py-4 md:hidden">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-heading text-muted-foreground tracking-wider underline underline-offset-4 decoration-2 decoration-border transition-colors hover:text-primary hover:decoration-primary" data-testid="link-go-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
