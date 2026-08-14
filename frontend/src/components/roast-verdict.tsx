"use client";

import { motion } from "motion/react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { cn } from "@/lib/utils";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { coalesceVerdictBars, type VerdictBar } from "@/lib/verdict-dimensions";

/**
 * The two pieces of roast presentation shared by the resume detail page and the
 * no-account trial page. Extracted so a change to the score dial or the verdict
 * chart lands in both places at once — the alternative was two copies drifting
 * apart on colours and thresholds.
 *
 * Both components size to their content. They must never stretch to fill a
 * parent, otherwise the panel that hosts them ends up with dead space below the
 * last row.
 */

export function scoreColorClass(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

/** Ring stroke that matches `scoreColorClass`. */
function scoreStrokeClass(score: number): string {
  if (score >= 70) return "stroke-emerald-500";
  if (score >= 40) return "stroke-amber-500";
  return "stroke-destructive";
}

export function scoreCaption(score: number): string {
  if (score >= 70) return "Not terrible.";
  if (score >= 40) return "Mediocre at best.";
  return "Brutal.";
}

/** Lowest-scoring dimension, so the summary can name it instead of gesturing
 *  vaguely at the chart. Ties resolve to the first in canonical order. */
function weakestBar(bars: VerdictBar[]): VerdictBar {
  return bars.reduce((low, b) => (b.score < low.score ? b : low), bars[0]);
}

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** Shared easing — a soft "settle" curve rather than a bouncy spring. */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function RoastScoreDial({
  score,
  bars,
  className,
}: {
  score: number;
  /** Optional — when present the summary names the weakest dimension. */
  bars?: VerdictBar[] | null;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const progress = clamped / 100;
  const weakest = bars && bars.length ? weakestBar(bars) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3.5",
        className,
      )}
    >
      <div
        className="relative size-24 shrink-0"
        role="img"
        aria-label={`Resume score: ${clamped} out of 100`}
      >
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="7"
            className="stroke-border"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className={scoreStrokeClass(clamped)}
            strokeDasharray={RING_CIRCUMFERENCE}
            initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress) }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.4, ease: EASE_OUT }}
            className={cn(
              "font-heading text-[26px] leading-none tabular-nums",
              scoreColorClass(clamped),
            )}
          >
            {clamped}
          </motion.span>
          <span className="mt-0.5 font-sans text-[11px] font-medium tabular-nums text-muted-foreground">
            / 100
          </span>
        </div>
      </div>

      {/* Body copy stays in the sans face. The display font (Heming) is for
          page headings — at 12–15px it costs legibility for no gain. */}
      <div className="min-w-0 space-y-1">
        <p className="font-sans text-[15px] font-semibold leading-snug">
          {scoreCaption(clamped)}
        </p>
        {weakest ? (
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            Weakest area:{" "}
            <span className="font-medium text-foreground">{weakest.label}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The panel is ~470px wide, so full dimension names ("Verb strength &
 * ownership") overflow the polar axis and get clipped at the edge. Radar axes
 * get a one-word tick; the full label still shows in the tooltip and in the
 * numeric readout underneath.
 */
const AXIS_TICK: Record<string, string> = {
  metricsImpact: "Metrics",
  verbStrength: "Verbs",
  technicalSignal: "Technical",
  structureClarity: "Structure",
  roleFit: "Role fit",
};

function axisTick(bar: VerdictBar): string {
  return AXIS_TICK[bar.id] ?? bar.label.split(/\s*[&/]\s*/)[0];
}

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function RoastVerdictRadar({
  bars,
  className,
}: {
  bars: VerdictBar[] | undefined | null;
  className?: string;
}) {
  const rows = coalesceVerdictBars(bars);
  const data = rows.map((bar) => ({
    axis: axisTick(bar),
    label: bar.label,
    score: Math.max(1, Math.min(5, bar.score)),
  }));

  return (
    <div
      className={cn("rounded-lg border border-border bg-muted/30 p-3.5", className)}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h4 className="font-sans text-[13px] font-semibold">Verdict</h4>
        <span className="font-sans text-[11px] text-muted-foreground">
          1–5 per axis
        </span>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[200px] w-full"
      >
        <RadarChart
          data={data}
          outerRadius="70%"
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelKey="label"
                formatter={(value) => (
                  <span className="font-sans text-xs font-medium tabular-nums">
                    {value}/5
                  </span>
                )}
              />
            }
          />
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: "hsl(var(--foreground))",
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "var(--font-geist), sans-serif",
            }}
          />
          <Radar
            dataKey="score"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="hsl(var(--chart-1))"
            fillOpacity={0.45}
            dot={{ r: 2.5, fillOpacity: 1, fill: "hsl(var(--chart-1))" }}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ChartContainer>

      {/* Numeric readout — the chart shows shape, this shows exact values.
          Sentence case, not all-caps: uppercase strips the word shapes that make
          a label scannable, which is exactly what hurts at this size. */}
      <ul className="mt-1 grid gap-x-4 gap-y-1.5 border-t border-border pt-3">
        {rows.map((bar) => (
          <li
            key={bar.id}
            className="flex items-baseline justify-between gap-3 font-sans text-xs"
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {bar.label}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {bar.score}
              <span className="text-muted-foreground">/5</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
