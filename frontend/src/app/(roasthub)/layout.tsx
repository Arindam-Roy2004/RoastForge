import { OnboardingGate } from "@/components/onboarding-gate";
import { RoastHubChrome } from "@/components/roasthub-chrome";
import type React from "react";

export default function RoastHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <OnboardingGate />
      <RoastHubChrome>{children}</RoastHubChrome>
    </div>
  );
}
