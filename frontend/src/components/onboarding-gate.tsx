"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

const ONBOARDING_PATH = "/onboarding/role";

/**
 * Pushes any signed-in user with `onboardingCompleted === false` to the
 * Candidate/Recruiter picker. Renders nothing — purely a side-effect.
 *
 * Intentionally does NOT redirect when the flag is undefined: that means we
 * haven't loaded /me yet (or the field was missing for an older response) and
 * we'd rather show the page than flash through an onboarding redirect.
 */
export function OnboardingGate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (user.onboardingCompleted !== false) return;
    if (pathname === ONBOARDING_PATH) return;
    router.replace(ONBOARDING_PATH);
  }, [loading, user, pathname, router]);

  return null;
}
