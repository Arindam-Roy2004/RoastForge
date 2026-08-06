"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { coalesceVerdictBars, verdictBarFillClass, type VerdictBar } from "@/lib/verdict-dimensions";

/**
 * The two pieces of roast presentation shared by the resume detail page and the
 * no-account trial page. Extracted so a change to the score dial or the verdict
 * bars lands in both places at once — the alternative was two copies drifting
 * apart on colours and thresholds.
 */

export function scoreColorClass(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-destructive";
}

export function scoreCaption(score: number): string {
  if (score >= 70) return "Not terrible.";
  if (score >= 40) return "Mediocre at best.";
  return "Brutal.";
}

export function RoastScoreDial({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1 border-b border-border pb-2", className)}>
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="flex h-20 w-20 flex-col items-center justify-center gap-0 rounded-full border border-border bg-background shadow-[var(--shadow-sm)]"
        role="img"
        aria-label={`Resume score: ${score} out of 100`}
      >
        <span className={cn("font-heading text-3xl leading-none", scoreColorClass(score))}>
          {score}
        </span>
      </motion.div>
      <p className="px-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {scoreCaption(score)}
      </p>
    </div>
  );
}

export function RoastVerdictBars({
  bars,
  className,
}: {
  bars: VerdictBar[] | undefined | null;
  className?: string;
}) {
  return (
    <div className={cn("overscroll-contain border border-border bg-muted/30 p-3", className)}>
      <h4 className="mb-2.5 flex items-center gap-2 font-heading text-xs tracking-wide">
        Verdict{" "}
        <span className="font-sans text-[10px] font-normal normal-case text-muted-foreground">
          (1–5 each)
        </span>
      </h4>
      <div className="space-y-2.5">
        {coalesceVerdictBars(bars).map((bar) => (
          <div key={bar.id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-[11px] font-bold uppercase tracking-tight">
              <span className="min-w-0 leading-tight text-foreground">{bar.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{bar.score}/5</span>
            </div>
            <div
              className="flex w-full gap-0.5"
              role="img"
              aria-label={`${bar.label}: ${bar.score} out of 5`}
            >
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-2.5 min-w-0 flex-1 border border-border shadow-[var(--shadow-2xs)]",
                    step <= bar.score ? verdictBarFillClass(bar.score) : "bg-background",
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
