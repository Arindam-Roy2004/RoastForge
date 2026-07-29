"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

// Routes that should render full-bleed without the global Navbar/Footer. The
// onboarding picker must lock the user in until they pick a role — showing
// nav links there caused a redirect loop (click link -> OnboardingGate sends
// them back) that read as a flicker.
const CHROMELESS_PATHS = new Set<string>(["/onboarding/role"]);

export function RoastHubChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = CHROMELESS_PATHS.has(pathname);

  if (hideChrome) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="container-app min-w-0 flex-1 py-8">
        {children}
      </main>
      <Footer />
    </>
  );
}
