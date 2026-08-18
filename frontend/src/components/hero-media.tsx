"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/store/theme";

/**
 * Hero shell: the artwork *is* the hero background (replacing the flat card
 * surface), and it swaps to a muted looping clip while the hero is hovered or
 * focused. Headline, search, and CTA render on top.
 *
 * Artwork follows the UI theme: day art in light mode, night art in dark mode.
 * The box carries a 16/9 aspect on md+ to match the source art exactly (both
 * assets are 1672x941), so `object-cover` fits with no crop.
 *
 * Playback notes (these were all sources of "sometimes it doesn't play"):
 *  - Hover and focus are tracked separately. They used to share one flag, so
 *    clicking the search box and then blurring it killed playback while the
 *    pointer was still inside the hero.
 *  - `play()` rejects with AbortError whenever a pending play is interrupted by
 *    pause() — normal during quick in/out movement. That rejection must be
 *    ignored, not treated as failure, or the clip stays permanently hidden.
 *  - Visibility is derived from `active && hasFrames` rather than being reset on
 *    every pointer event, so re-entering is instant instead of re-buffering.
 */
export function HeroShowcase({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { theme, mounted } = useTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hasFrames, setHasFrames] = useState(false);
  const [allowMotion, setAllowMotion] = useState(true);
  // Decorative and multi-megabyte, so the <video> is not mounted until first
  // interaction. Nothing is downloaded on page load.
  const [armed, setArmed] = useState(false);

  const isDark = mounted && theme === "dark";
  const poster = isDark ? "/hero-night.png" : "/hero-day.png";
  const clip = isDark ? "/hero-night.mp4" : "/hero-day.mp4";

  const active = (hovering || focused) && allowMotion;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAllowMotion(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Theme swap changes the source: drop frames so the poster covers the reload.
  useEffect(() => {
    setHasFrames(false);
  }, [clip]);

  // Single place that drives playback. Runs whenever intent or source changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (active) {
      // AbortError here is expected when the pointer flicks in and out; it is
      // not a failure, so it must not flip any visibility state.
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active, armed, clip]);

  const start = useCallback(() => {
    setArmed(true);
    setHovering(true);
  }, []);

  const stop = useCallback(() => setHovering(false), []);

  // Focus is tracked independently so it cannot cancel an active hover.
  const focusIn = useCallback(() => {
    setArmed(true);
    setFocused(true);
  }, []);

  const focusOut = useCallback(() => setFocused(false), []);

  return (
    <section
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocusCapture={focusIn}
      onBlurCapture={focusOut}
      className={cn(
        "relative isolate mb-14 grid w-full place-items-center overflow-hidden rounded-xl border-2 border-border md:mb-18",
        "md:aspect-[16/9]",
        className,
      )}
    >
      {/* Poster — always present, so there is never an empty frame. */}
      <Image
        key={poster}
        src={poster}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 1180px) 100vw, 1180px"
        priority
        className="z-0 object-cover object-center"
      />

      {/* Clip — mounted on first interaction, revealed once it has frames. */}
      {armed && (
        <video
          ref={videoRef}
          key={clip}
          src={clip}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onLoadedData={() => setHasFrames(true)}
          onPlaying={() => setHasFrames(true)}
          className={cn(
            "absolute inset-0 z-10 size-full object-cover object-center transition-opacity duration-500 ease-out",
            active && hasFrames ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {/* Scrim — keeps headline/search/CTA legible over the artwork. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-20 bg-background/72 supports-[backdrop-filter]:bg-background/64"
      />

      <div className="relative z-30 w-full space-y-7 px-5 py-14 text-center sm:px-7 md:space-y-8 md:px-10 md:py-16">
        {children}
      </div>
    </section>
  );
}
