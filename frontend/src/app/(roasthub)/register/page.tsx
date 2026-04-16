"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [busy, setBusy] = useState(false);

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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-16">
      <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
        <CardHeader className="text-center space-y-3 p-8 pb-6">
          <div className="mx-auto bg-primary w-12 h-12 flex items-center justify-center rounded-full border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-heading tracking-tighter">Join the Forge</CardTitle>
          <CardDescription className="text-muted-foreground font-medium text-sm">
            One tap to create your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-4">
          <div
            className={`flex justify-center transition-opacity ${busy ? "opacity-50 pointer-events-none" : ""}`}
            data-testid="google-signup-slot"
          >
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={() => toast.error("Google sign-up was cancelled or failed")}
              theme="outline"
              shape="rectangular"
              size="large"
              text="signup_with"
              useOneTap={false}
            />
          </div>
          <p className="text-[10px] text-center text-muted-foreground/80 font-medium tracking-wide">
            We only use your Google name &amp; email. We never post on your behalf.
          </p>
        </CardContent>
        <div className="flex justify-center border-t-[3px] border-border bg-muted p-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-heading text-primary hover:underline tracking-wider" data-testid="link-go-login">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
