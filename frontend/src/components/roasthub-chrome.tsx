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

// Auth routes: keep the navbar (so you can still get back out, and toggle
// theme) but drop the footer and centre the card.
//
// The footer is wrong here on two counts. Its "Navigate" links are Upload and
// Profile, neither of which is gated on being signed in — so a logged-out
// visitor staring at the sign-in wall gets two links that would bounce them
// straight back to it. And the footer's height (plus its own `mt-20`) is what
// squeezed `main` enough that centring inside it landed above the viewport's
// centre. With the footer gone, `flex-1` inside the layout's `min-h-screen`
// column fills the space below the navbar exactly, so the card centres on the
// screen with no scrollbar.
const AUTH_PATHS = new Set<string>(["/login", "/register"]);

export function RoastHubChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = CHROMELESS_PATHS.has(pathname);

  if (hideChrome) {
    return <main className="flex-1">{children}</main>;
  }

  if (AUTH_PATHS.has(pathname)) {
    return (
      <>
        <Navbar />
        <main className="container-app flex min-w-0 flex-1 items-center justify-center">
          {children}
        </main>
      </>
    );
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
