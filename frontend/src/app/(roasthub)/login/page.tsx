"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import type { CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/store/auth";

/**
 * Sign-in page. Google is the only auth method — first-time Google users are
 * routed onward to /onboarding/role to pick Candidate or Recruiter; returning
 * users go straight to the gallery.
 *
 * `useRequireAuth` appends `?next=<path>` when it bounces someone off a gated
 * page, so they land back where they were headed. Only same-site absolute
 * paths are honoured — accepting an arbitrary value here would turn the login
 * page into an open redirect that phishing links could point at another host.
 *
 * We read `?next=` directly off `window.location` inside the success handler
 * (not via `useSearchParams`) so the page stays statically renderable without
 * a Suspense boundary.
 */
function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  async function onGoogleSuccess(res: CredentialResponse) {
    const raw = new URLSearchParams(window.location.search).get("next");
    const next = safeNextPath(raw);
    try {
      const user = await signInWithGoogle(res.credential!);
      toast.success("Welcome to RoastForge");
      // Role picker wins over `next`: a brand-new account can't use a gated
      // page until it has chosen Candidate or Recruiter anyway.
      if (user.onboardingCompleted === false) {
        router.push("/onboarding/role");
        return;
      }
      router.push(next ?? "/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    }
  }

  return <AuthShell mode="signin" onGoogleSuccess={onGoogleSuccess} />;
}