"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Search, Flame } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RoleChoice = "user" | "recruiter";

/**
 * One-step onboarding picker shown after a fresh Google sign-up. Defaults to
 * Candidate (the most common case). Submitting flips `onboardingCompleted` to
 * true on the server, after which the OnboardingGate stops redirecting.
 */
export default function OnboardingRolePage() {
  const router = useRouter();
  const { user, loading, completeOnboarding } = useAuth();
  const [choice, setChoice] = useState<RoleChoice>("user");
  const [submitting, setSubmitting] = useState(false);

  // If a returning user lands here directly, send them home rather than letting
  // them re-pick a role (the form would silently overwrite their existing role).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.onboardingCompleted !== false) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function onSubmit() {
    setSubmitting(true);
    try {
      await completeOnboarding(choice);
      toast.success(choice === "recruiter" ? "Welcome, recruiter" : "You're in");
      router.replace(choice === "recruiter" ? "/recruiter" : "/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your choice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-16">
      <Card className="w-full max-w-2xl border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
        <CardHeader className="text-center space-y-2 p-8 pb-4">
          <div className="mx-auto bg-primary w-12 h-12 flex items-center justify-center rounded-full border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-2">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-heading tracking-tighter">Pick Your Side</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            We tailor RoastForge differently for candidates and recruiters. You can change this later in your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 space-y-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RoleCard
              active={choice === "user"}
              onClick={() => setChoice("user")}
              icon={<Briefcase className="w-6 h-6" />}
              title="Candidate"
              blurb="Upload resumes, get roasted by the community, and surface your work to recruiters."
              testId="role-card-user"
            />
            <RoleCard
              active={choice === "recruiter"}
              onClick={() => setChoice("recruiter")}
              icon={<Search className="w-6 h-6" />}
              title="Recruiter"
              blurb="Search candidates by target role, skills, and AI-scored work. No resume uploads."
              testId="role-card-recruiter"
            />
          </div>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading text-lg h-12 tracking-wide"
            data-testid="button-submit-onboarding"
          >
            {submitting ? "Setting up..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  blurb,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  blurb: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={`text-left border-[3px] border-border rounded-none p-5 transition-all flex flex-col gap-3 ${
        active
          ? "bg-primary text-primary-foreground shadow-none translate-x-0.5 translate-y-0.5"
          : "bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
      }`}
    >
      <div
        className={`w-10 h-10 flex items-center justify-center rounded-full border-[3px] border-border ${
          active ? "bg-primary-foreground text-primary" : "bg-muted text-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-lg tracking-wide">{title}</h3>
        <p className={`text-sm leading-snug ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{blurb}</p>
      </div>
    </button>
  );
}
