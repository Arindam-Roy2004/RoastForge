"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/store/theme";

/**
 * Hero shell: the artwork *is* the hero background, and it swaps to a muted
 * looping clip while the hero is hovered or focused. Headline, search, and CTA
 * render on top.
 *
 * Artwork follows the UI theme: day art in light mode, night art in dark mode.
 * The box carries a 16/9 aspect on md+ to match the source art exactly (both
 * assets are 1672x941), so `object-cover` fits with no crop.
 *
 * ## Why theme switches are instant
 *
 * Both posters are always mounted and cross-faded with `dark:` classes rather
 * than swapping one `src`. Swapping meant every toggle unmounted the image and
 * fetched a different ~2 MB file before anything could paint. With both in the
 * DOM, the second one is already decoded, so a toggle is just an opacity change.
 *
 * The `dark:` variant also fixes first paint. The theme class is set on <html>
 * by an inline script before hydration, so CSS already knows the theme; the old
 * `mounted && theme` check didn't, and dark-mode visitors saw the day art flash
 * before React corrected it.
 *
 * Clips work the same way once loaded: each keeps its own <video> and buffer,
 * so toggling mid-hover cross-fades between two ready videos instead of
 * throwing one away and re-downloading the other.
 *
 * Playback notes (these were all sources of "sometimes it doesn't play"):
 *  - Hover and focus are tracked separately, so blurring the search box can't
 *    stop playback while the pointer is still inside the hero.
 *  - `play()` rejects with AbortError whenever a pending play is interrupted by
 *    pause() — normal during quick in/out movement. That rejection is ignored.
 */

type Clip = "day" | "night";

const CLIPS: Record<Clip, string> = {
  day: "/hero-day.mp4",
  night: "/hero-night.mp4",
};

export function HeroShowcase({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { theme, mounted } = useTheme();
  const videoRefs = useRef<Record<Clip, HTMLVideoElement | null>>({ day: null, night: null });

  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState<Record<Clip, boolean>>({ day: false, night: false });
  const [allowMotion, setAllowMotion] = useState(true);
  // Decorative and multi-megabyte, so no <video> is mounted until the first
  // interaction. Nothing is downloaded on page load.
  const [armed, setArmed] = useState(false);

  // Only drives the clips, which never render before interaction (and so
  // never before mount). The posters don't depend on this — see above.
  const activeClip: Clip = mounted && theme === "dark" ? "night" : "day";

  const active = (hovering || focused) && allowMotion;

  // Which clips exist in the DOM. The current theme's clip mounts on first
  // interaction. The other one mounts only after that has frames, so the two
  // never compete for bandwidth while the first is buffering. Once both are
  // mounted they stay mounted, which is what makes later toggles instant.
  const anyReady = ready.day || ready.night;
  const mountedClips: Clip[] = !armed ? [] : anyReady ? ["day", "night"] : [activeClip];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAllowMotion(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Play only the clip for the current theme; keep the other paused but loaded.
  useEffect(() => {
    for (const clip of ["day", "night"] as const) {
      const v = videoRefs.current[clip];
      if (!v) continue;
      if (active && clip === activeClip) {
        // AbortError here is expected when the pointer flicks in and out; it is
        // not a failure, so it must not flip any visibility state.
        void v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, [active, activeClip, armed, anyReady]);

  const markReady = useCallback((clip: Clip) => {
    setReady((prev) => (prev[clip] ? prev : { ...prev, [clip]: true }));
  }, []);

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
      {/* Posters — both always present, so there's never an empty frame and a
          theme toggle never waits on the network. */}
      <Image
        src="/hero-day.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 1180px) 100vw, 1180px"
        priority
        className="z-0 object-cover object-center opacity-100 transition-opacity duration-500 ease-out dark:opacity-0"
      />
      <Image
        src="/hero-night.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 1180px) 100vw, 1180px"
        priority
        className="z-0 object-cover object-center opacity-0 transition-opacity duration-500 ease-out dark:opacity-100"
      />

      {/* Clips — mounted on first interaction, revealed once they have frames. */}
      {mountedClips.map((clip) => (
        <video
          key={clip}
          ref={(el) => {
            videoRefs.current[clip] = el;
          }}
          src={CLIPS[clip]}
          muted
          loop
          playsInline
          // Only the current theme's clip starts itself; the other stays
          // paused until the theme switches to it.
          autoPlay={clip === activeClip && active}
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onLoadedData={() => markReady(clip)}
          onPlaying={() => markReady(clip)}
          className={cn(
            "absolute inset-0 z-10 size-full object-cover object-center transition-opacity duration-500 ease-out",
            active && clip === activeClip && ready[clip] ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

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
