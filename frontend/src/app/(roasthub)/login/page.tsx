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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-16">
      <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
        <CardHeader className="text-center space-y-2 p-8 pb-4">
          <div className="mx-auto bg-primary w-12 h-12 flex items-center justify-center rounded-full border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-2">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-heading tracking-tighter">Sign in to RoastForge</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            One-tap with Google. New here? We&apos;ll set you up after sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-6">
          <div
            className={`flex justify-center transition-opacity ${busy ? "opacity-50 pointer-events-none" : ""}`}
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
          <p className="text-[11px] text-center text-muted-foreground font-medium leading-relaxed">
            By continuing you agree that we&apos;ll use your Google email and name to create your RoastForge account.
            We don&apos;t post anything on your behalf.
          </p>
        </CardContent>
        <div className="flex justify-center border-t-[3px] border-border bg-muted p-6">
          <p className="text-sm text-muted-foreground">
            New to RoastForge?{" "}
            <Link href="/register" className="font-heading text-primary hover:underline tracking-wider" data-testid="link-go-register">
              Create an account
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
