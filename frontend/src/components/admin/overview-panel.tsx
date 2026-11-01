"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { adminApi, type AdminAction, type AdminActivity, type AdminOverview, type AdminWeekly } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CommentIcon,
  LockIcon,
  RefreshIcon,
  ResumeIcon,
  TrashIcon,
  TrendIcon,
  UnlockIcon,
  ProjectIcon,
  UsersIcon,
  type PikaIcon,
} from "@/components/icons/pika";
import {
  ADMIN_CARD,
  CountUp,
  EmptyState,
  ErrorState,
  MICRO_LABEL,
  SegmentedControl,
  formatDateTime,
  formatRelative,
  percentChange,
  useAdminQuery,
} from "./admin-kit";

const load = () => adminApi.overview();

export function OverviewPanel() {
  const { data, previous, error, loading, reload } = useAdminQuery("overview", load);
  const view = data ?? previous;

  if (error && !view) {
    return (
      <div className={cn(ADMIN_CARD, "py-16")}>
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!view) return <OverviewSkeleton />;

  return (
    <div className="flex flex-col gap-4" aria-busy={loading}>
      <StatStrip overview={view} />
      <div className="grid gap-4 lg:grid-cols-5">
        <ActivityChart series={view.series} className="lg:col-span-3" />
        <Members counts={view.counts} className="lg:col-span-2" />
      </div>
      <AuditFeed activity={view.activity} loading={loading} onReload={reload} />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-[104px] rounded-xl border border-foreground/12" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-[268px] rounded-xl border border-foreground/12 lg:col-span-3" />
        <Skeleton className="h-[268px] rounded-xl border border-foreground/12 lg:col-span-2" />
      </div>
      <Skeleton className="h-64 rounded-xl border border-foreground/12" />
    </div>
  );
}

// ─── KPI strip ───────────────────────────────────────────────────────────────

function Delta({ weekly }: { weekly: AdminWeekly }) {
  const change = percentChange(weekly.current, weekly.previous);
  if (change === null) return null;
  const up = change >= 0;
  return (
    <span
      title={`${weekly.current} this week, ${weekly.previous} the week before`}
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-[0.6875rem] font-medium tabular-nums",
        up ? "text-primary-strong" : "text-destructive",
      )}
    >
      <TrendIcon className={cn("size-3.5", !up && "-scale-y-100")} />
      {up ? "+" : ""}
      {change}%
    </span>
  );
}

/**
 * Four figures in one card split by hairlines (the 1px grid gap shows the
 * card's own rule colour through), so the row costs one card's worth of chrome
 * instead of four boxes of mostly empty space.
 */
function StatStrip({ overview }: { overview: AdminOverview }) {
  const { counts, weekly } = overview;
  const perCandidate = counts.candidates ? (counts.projects / counts.candidates).toFixed(1) : "0";

  const cells: { label: string; icon: PikaIcon; value: number; weekly?: AdminWeekly; note: string }[] = [
    { label: "Members", icon: UsersIcon, value: counts.users, weekly: weekly.users, note: `${weekly.users.current} joined this week` },
    { label: "Resumes", icon: ResumeIcon, value: counts.resumes, weekly: weekly.resumes, note: `${weekly.resumes.current} uploaded this week` },
    { label: "Comments", icon: CommentIcon, value: counts.comments, weekly: weekly.comments, note: `${weekly.comments.current} posted this week` },
    { label: "Projects", icon: ProjectIcon, value: counts.projects, note: `${perCandidate} per candidate` },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-foreground/12 bg-foreground/10 shadow-[var(--shadow-xs)] lg:grid-cols-4">
      {cells.map(({ label, icon: Icon, value, weekly: w, note }) => (
        <div key={label} className="bg-card px-4 py-3.5">
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <span className={MICRO_LABEL}>{label}</span>
            <Icon className="size-4 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <CountUp
              value={value}
              className="text-2xl leading-none font-semibold tracking-tight text-foreground tabular-nums"
            />
            {w && <Delta weekly={w} />}
          </div>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">{note}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Chart ───────────────────────────────────────────────────────────────────

type Metric = "users" | "resumes" | "comments";

const METRICS: { value: Metric; label: string; noun: string }[] = [
  { value: "users", label: "Sign-ups", noun: "sign-ups" },
  { value: "resumes", label: "Resumes", noun: "resumes" },
  { value: "comments", label: "Comments", noun: "comments" },
];

const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", ...opts });

/**
 * Daily bars for the last 14 days, one metric at a time so it stays one hue
 * with no legend. Hover or focus a bar for that day; a visually hidden table
 * carries the same numbers for screen readers.
 */
function ActivityChart({ series, className }: { series: AdminOverview["series"]; className?: string }) {
  const reduce = useReducedMotion();
  const [metric, setMetric] = useState<Metric>("users");
  const [active, setActive] = useState<number | null>(null);
  const noun = METRICS.find((m) => m.value === metric)!.noun;
  const values = series.map((d) => d[metric]);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const last = series.length - 1;

  return (
    <section className={cn(ADMIN_CARD, "flex flex-col p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-sm font-semibold tracking-tight text-foreground">Activity</h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{total.toLocaleString()}</span> {noun} in 14 days
          </p>
        </div>
        <SegmentedControl value={metric} onChange={setMetric} options={METRICS} label="Chart metric" size="sm" />
      </div>

      <div className="relative mt-6 flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-foreground/12" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-card pl-1.5 font-mono text-[0.625rem] leading-none text-muted-foreground tabular-nums">
          {max}
        </span>
        <div
          className="flex min-h-36 flex-1 items-end gap-1 border-b border-foreground/15"
          onMouseLeave={() => setActive(null)}
        >
          {series.map((day, i) => {
            const v = day[metric];
            return (
              <button
                key={day.date}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${dayLabel(day.date, { weekday: "long", day: "numeric", month: "long" })}: ${v} ${noun}`}
                className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
              >
                <motion.span
                  key={metric}
                  className={cn(
                    "block w-full max-w-7 rounded-t-[4px] transition-colors group-focus-visible:ring-3 group-focus-visible:ring-ring/45",
                    v ? "bg-primary" : "bg-foreground/8",
                    active !== null && active !== i && v > 0 && "bg-primary/35",
                    i === last && v > 0 && active === null && "bg-primary-strong",
                  )}
                  initial={reduce ? false : { height: 0 }}
                  animate={{ height: v ? `${(v / max) * 100}%` : 3 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 22, delay: i * 0.015 }}
                />
                {active === i && (
                  <span
                    role="tooltip"
                    className={cn(
                      "pointer-events-none absolute bottom-full z-10 mb-2 w-max rounded-md border border-popover-border bg-popover px-2.5 py-1.5 text-left text-xs shadow-[var(--shadow-md)]",
                      i < 3 ? "left-0" : i > last - 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    <span className="block font-medium text-foreground">
                      {dayLabel(day.date, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="block text-muted-foreground tabular-nums">
                      <span className="font-medium text-foreground">{v}</span> {noun}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.625rem] text-muted-foreground">
          <span>{series[0] ? dayLabel(series[0].date, { day: "numeric", month: "short" }) : ""}</span>
          <span>Today</span>
        </div>
      </div>

      <table className="sr-only">
        <caption>Daily {noun}, last 14 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>{noun}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d[metric]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Members ─────────────────────────────────────────────────────────────────

function Members({ counts, className }: { counts: AdminOverview["counts"]; className?: string }) {
  const total = Math.max(1, counts.users);
  const split = [
    { label: "Candidates", value: counts.candidates, swatch: "bg-chart-1" },
    { label: "Recruiters", value: counts.recruiters, swatch: "bg-chart-3" },
  ];
  const flags = [
    { label: "Admins", value: counts.admins, swatch: "bg-chart-4" },
    { label: "Suspended", value: counts.suspended, swatch: "bg-destructive" },
  ];
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <section className={cn(ADMIN_CARD, "flex flex-col p-4", className)}>
      <h2 className="font-sans text-sm font-semibold tracking-tight text-foreground">Members</h2>
      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
        <span className="font-medium text-foreground">{counts.users.toLocaleString()}</span> accounts
      </p>

      <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-foreground/8" role="img" aria-label={split.map((s) => `${s.label} ${pct(s.value)}`).join(", ")}>
        {split.map((s) =>
          s.value > 0 ? (
            <motion.span
              key={s.label}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", s.swatch)}
              initial={{ width: 0 }}
              animate={{ width: pct(s.value) }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ) : null,
        )}
      </div>

      <dl className="mt-5 space-y-2.5">
        {split.map((s) => (
          <MemberRow key={s.label} {...s} share={pct(s.value)} />
        ))}
      </dl>
      <dl className="mt-auto space-y-2.5 border-t border-dashed border-foreground/12 pt-4">
        {flags.map((s) => (
          <MemberRow key={s.label} {...s} />
        ))}
      </dl>
    </section>
  );
}

function MemberRow({ label, value, swatch, share }: { label: string; value: number; swatch: string; share?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span aria-hidden className={cn("size-2 rounded-[3px]", swatch)} />
      <dt className="flex-1 text-muted-foreground">{label}</dt>
      {share && <span className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">{share}</span>}
      <dd className="w-12 text-right font-medium text-foreground tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}

// ─── Audit feed ──────────────────────────────────────────────────────────────

const ACTIONS: Record<AdminAction, { verb: string; icon: PikaIcon; tone: "neutral" | "danger" }> = {
  "user.role": { verb: "Changed role of", icon: UsersIcon, tone: "neutral" },
  "user.suspend": { verb: "Suspended", icon: LockIcon, tone: "danger" },
  "user.reinstate": { verb: "Reinstated", icon: UnlockIcon, tone: "neutral" },
  "user.delete": { verb: "Deleted account", icon: TrashIcon, tone: "danger" },
  "resume.delete": { verb: "Removed resume", icon: TrashIcon, tone: "danger" },
  "comment.delete": { verb: "Removed comment", icon: TrashIcon, tone: "danger" },
};

function AuditFeed({
  activity,
  loading,
  onReload,
}: {
  activity: AdminActivity[];
  loading: boolean;
  onReload: () => void;
}) {
  return (
    <section className={cn(ADMIN_CARD, "overflow-hidden")}>
      <div className="flex items-center justify-between gap-4 border-b border-foreground/8 px-4 py-3">
        <h2 className="font-sans text-sm font-semibold tracking-tight text-foreground">Audit log</h2>
        <Button variant="ghost" size="icon-xs" onClick={onReload} disabled={loading} aria-label="Refresh overview">
          <RefreshIcon className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>
      {activity.length === 0 ? (
        <div className="py-14">
          <EmptyState title="No admin actions yet" />
        </div>
      ) : (
        <ol className="max-h-[360px] divide-y divide-foreground/8 overflow-y-auto overscroll-y-contain">
          {activity.map((a) => {
            const { verb, icon: Icon, tone } = ACTIONS[a.action];
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1",
                    tone === "danger"
                      ? "bg-destructive/8 text-destructive ring-destructive/15"
                      : "bg-accent text-primary-strong ring-primary/15",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm break-words text-foreground">
                    <span className="text-muted-foreground">{verb}</span>{" "}
                    <span className="font-medium">{a.targetLabel || "—"}</span>
                    {a.detail && (
                      <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                        {a.detail}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.actor?.name ?? "Removed admin"}</p>
                </div>
                <time
                  dateTime={a.createdAt}
                  title={formatDateTime(a.createdAt)}
                  className="shrink-0 pt-0.5 font-mono text-[0.6875rem] whitespace-nowrap text-muted-foreground tabular-nums"
                >
                  {formatRelative(a.createdAt)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
