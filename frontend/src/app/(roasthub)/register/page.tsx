"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import type { CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/store/auth";

/**
 * Sign-up surface. Functionally identical to /login — both POST the same
 * Google ID token to /api/auth/google. The split exists for UX: users who
 * think of themselves as "new here" want a Sign Up button, users who think of
 * themselves as "returning" want Sign In. The backend doesn't care; the
 * OnboardingGate (and the explicit redirect below) routes first-timers
 * through /onboarding/role.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  async function onGoogleSuccess(res: CredentialResponse) {
    try {
      const user = await signInWithGoogle(res.credential!);
      // Industry standard: brand-new sign-ups go straight into the role
      // picker; an existing Google account that happened to land on /register
      // skips it.
      if (user.onboardingCompleted === false) {
        toast.success("Account created — pick your role");
        router.push("/onboarding/role");
      } else {
        toast.success("Welcome back");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed");
    }
  }

  return <AuthShell mode="signup" onGoogleSuccess={onGoogleSuccess} />;
}