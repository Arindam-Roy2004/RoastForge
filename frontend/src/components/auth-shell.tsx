"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useTheme } from "@/store/theme";
import { toast } from "sonner";
import FlameIcon from "@/components/icons/flame-icon";
import { GuestTrialOption, BottomGradient, authBarClass } from "@/components/guest-trial-option";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for /login and /register.
 *
 * Both routes POST the same Google ID token to the backend — the split is
 * purely UX copy, but the URLs are kept because `useRequireAuth` appends
 * `?next=` to them on bounce and the navbar links to them directly. Switching
 * mode is a *local* state change rather than a navigation so the copy can
 * animate; the URL is kept in sync via replaceState so refresh / back /
 * forward still land on the right mode.
 *
 * Styling follows the easter.chat auth surface: a diagonal pinstripe screen
 * backdrop, one narrow rounded-2xl card with a hairline border and backdrop
 * blur, engraved-bevel buttons, and a gradient hairline divider. Everything is
 * expressed in this project's tokens so it themes correctly in light and dark.
 *
 * Mode is switched from exactly one place — the footer link. An earlier
 * revision also had a pill tab-toggle at the top of the card, which meant two
 * controls doing the same job on a very small surface.
 */
export type AuthMode = "signin" | "signup";

/**
 * Google renders its own iframe and only accepts a fixed pixel width, so the
 * width has to be derived from the layout rather than the other way round:
 * `max-w-sm` (384) − card border (2) − card `p-6` (48) = 334 of content, then
 * − the bar's own border (2) = 332 inside the slot. Getting this exact keeps
 * the Google button flush with the guest bar beneath it and stops the iframe
 * spilling past the bar's rounded corners.
 */
const GOOGLE_BUTTON_PX = 332;

interface AuthShellProps {
  mode: AuthMode;
  onGoogleSuccess: (res: CredentialResponse) => Promise<void> | void;
}

interface ModeCopy {
  heading: string;
  subhead: string;
  googleText: "continue_with" | "signup_with";
  errorToast: string;
  switchPrompt: string;
  switchAction: string;
}

const COPY: Record<AuthMode, ModeCopy> = {
  signin: {
    heading: "Welcome back",
    subhead: "Sign in to pick up where you left off.",
    googleText: "continue_with",
    errorToast: "Google sign-in was cancelled or failed",
    switchPrompt: "Don't have an account?",
    switchAction: "Sign up",
  },
  signup: {
    heading: "Create an account",
    subhead: "Join the Forge and get your resume roasted.",
    googleText: "signup_with",
    errorToast: "Google sign-up was cancelled or failed",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
  },
};

export function AuthShell({ mode, onGoogleSuccess }: AuthShellProps) {
  const { theme, mounted } = useTheme();
  const isDark = mounted && theme === "dark";

  const [localMode, setLocalMode] = useState<AuthMode>(mode);
  const [busy, setBusy] = useState(false);

  function toggleMode() {
    const next: AuthMode = localMode === "signin" ? "signup" : "signin";
    setLocalMode(next);
    if (typeof window !== "undefined") {
      const target = next === "signin" ? "/login" : "/register";
      window.history.replaceState({}, "", target);
    }
  }

  const direction = localMode === "signup" ? 1 : -1;
  const activeCopy = COPY[localMode];

  return (
    <>
      {/* Pinstripe screen backdrop, plus a scrim so the texture stays a
          whisper behind the card rather than competing with it. `fixed` keeps
          it exactly viewport-sized, so it can't introduce a scrollbar. */}
      <div aria-hidden className="auth-backdrop pointer-events-none fixed inset-0 -z-10" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-background/40" />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="auth-heading"
        className="flex w-full flex-col items-center justify-center py-8"
      >
        {/* Card sits on this project's own `--card`/`--border` tokens in both
            themes, one step darker than the page background; the action bars
            below use `--secondary`, which this app already defines a step
            lighter than `--card` in dark mode, so they still read as raised
            off the card exactly like the reference — without introducing a
            second, disconnected near-black. */}
        <div className="shadow-input mx-auto w-full max-w-sm rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-md">
          <div className="text-center">
            <span className="inline-flex items-center gap-2">
              {/* FlameIcon bakes in `cursor-pointer` for its interactive use
                  in the navbar; here it's a decorative mark, so reset it. */}
              <FlameIcon
                size={16}
                className="shrink-0 cursor-default text-primary-strong"
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="label-mono text-xs leading-none text-muted-foreground">
                RoastForge
              </span>
            </span>

            {/* Reserved height keeps the actions below from shifting when the
                copy swaps between modes. */}
            <div className="mt-5 grid min-h-[4.75rem] content-start gap-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={`h-${localMode}`}
                  id="auth-heading"
                  initial={{ opacity: 0, x: 18 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 * direction }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="font-heading text-2xl font-semibold tracking-tight text-foreground"
                >
                  {activeCopy.heading}
                </motion.h1>
              </AnimatePresence>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`p-${localMode}`}
                  initial={{ opacity: 0, x: 18 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 * direction }}
                  transition={{ duration: 0.32, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {activeCopy.subhead}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Google draws its own button inside this slot. The inner box
              clips Google's rendered surface (including its own drop-shadow)
              to our rounded corners; BottomGradient sits on the unclipped
              outer wrapper so it can still paint just past that edge. Hover
              never transforms, so nothing in the stack can shift. */}
          <div
            className={cn(
              "group/btn relative mt-7",
              busy && "pointer-events-none opacity-50",
            )}
          >
            <div
              className={cn(authBarClass, "overflow-hidden")}
              data-testid={localMode === "signin" ? "google-login-slot" : "google-signup-slot"}
            >
              {mounted && (
                <GoogleLogin
                  onSuccess={(res) => {
                    if (!res.credential) {
                      toast.error("Google did not return a credential");
                      return;
                    }
                    setBusy(true);
                    Promise.resolve(onGoogleSuccess(res));
                  }}
                  onError={() => toast.error(activeCopy.errorToast)}
                  theme={isDark ? "filled_black" : "outline"}
                  shape="rectangular"
                  size="large"
                  text={activeCopy.googleText}
                  useOneTap={false}
                  width={String(GOOGLE_BUTTON_PX)}
                />
              )}
            </div>
            <BottomGradient />
          </div>

          <GuestTrialOption />

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground/80">
            We only use your Google name and email. We never post on your behalf.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {activeCopy.switchPrompt}{" "}
            <button
              type="button"
              data-testid={localMode === "signin" ? "link-go-register" : "link-go-login"}
              onClick={toggleMode}
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary-strong hover:decoration-primary"
            >
              {activeCopy.switchAction}
            </button>
          </p>
        </div>
      </motion.section>
    </>
  );
}
