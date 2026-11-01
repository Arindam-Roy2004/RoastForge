"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { animate, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ApiRequestError, type AdminPerson, type AdminUser, type ApiResult } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { GradientAvatar } from "@/components/gradient-avatar";
import { AlertIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon, SearchIcon } from "@/components/icons/pika";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Panel shell. A 12% hairline rather than the ink `--border` the product pages
 * use: a dashboard stacks many panels, and an ink outline on each one turns the
 * page into a grid of boxes.
 */
export const ADMIN_CARD = "rounded-xl border border-foreground/12 bg-card shadow-[var(--shadow-xs)]";

/** Inputs inside panels take the same hairline instead of the 2px ink edge. */
export const ADMIN_INPUT = "border border-foreground/15 shadow-none";

/**
 * Height cap for a list's scroll area. Lists scroll inside their card rather
 * than stretching the page: twenty rows would otherwise push the pager a
 * full screen below the search box that drives it. The `dvh` term keeps the
 * whole card on screen on short laptops; 560px stops it ballooning on tall ones.
 */
export const LIST_SCROLL =
  "max-h-[min(560px,calc(100dvh-18rem))] min-h-[280px] overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]";

/**
 * Sticky table head for `LIST_SCROLL`. Opaque, because rows slide under it, and
 * its rule is an inset shadow: a row border on a sticky header scrolls away
 * with the collapsed table borders.
 */
export const STICKY_HEAD =
  "sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.08)] [&_tr]:border-0";

/** Small uppercase-mono section label — the brand's own micro-label. */
export const MICRO_LABEL = "label-mono text-[0.6875rem] text-muted-foreground";

// ─── Data ────────────────────────────────────────────────────────────────────

type Settled<T> = { key: string; nonce: number; data?: T; error?: string };

/**
 * Fetches whenever `key` changes and ignores responses for any key but the
 * latest, so a slow page-1 response can't overwrite page 2.
 *
 * Loading is derived (the settled result belongs to a different key), never
 * set, which keeps state writes out of the effect body. `previous` holds the
 * last good payload so a list can stay on screen, dimmed, while the next page
 * arrives instead of collapsing to a skeleton.
 *
 * A 401/403 here means the session lost admin (or was suspended) after the
 * page loaded, so the auth store is refreshed and the page re-gates itself.
 */
export function useAdminQuery<T>(key: string, load: () => Promise<ApiResult<T>>) {
  const { refresh } = useAuth();
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Settled<T> | null>(null);

  const fetchLatest = useEffectEvent(load);
  const onDenied = useEffectEvent(() => void refresh());

  useEffect(() => {
    let cancelled = false;
    fetchLatest().then(
      (res) => {
        if (!cancelled) setResult({ key, nonce, data: res.data });
      },
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) onDenied();
        setResult({ key, nonce, error: err instanceof Error ? err.message : "Request failed" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const settled = result !== null && result.key === key && result.nonce === nonce;
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: settled ? result.data : undefined,
    previous: result?.data,
    error: settled ? result.error : undefined,
    loading: !settled,
    reload,
  };
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Search box state plus a page number that falls back to 1 whenever the
 * debounced term or `scope` (e.g. a filter) changes. The page remembers the
 * query it was set for, so the reset is derived rather than effected.
 */
export function usePagedSearch(scope = "") {
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 300);
  const query = `${scope}|${term}`;
  const [paging, setPaging] = useState({ query, page: 1 });
  const page = paging.query === query ? paging.page : 1;
  const setPage = useCallback((next: number) => setPaging({ query, page: Math.max(1, next) }), [query]);
  return { search, setSearch, term, page, setPage };
}

/** Runs one admin mutation with toast feedback. Resolves true on success. */
export async function runAdminAction(action: () => Promise<unknown>, success: string) {
  try {
    await action();
    toast.success(success);
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Something went wrong");
    return false;
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" });

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFormat.format(d);
}

export function formatDateTime(value: string) {
  return dateTimeFormat.format(new Date(value));
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function formatRelative(value: string) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** Week-over-week change as a whole percent, or null with no baseline. */
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/**
 * Whole number that counts up to its value on mount and on change. Writes the
 * text node directly rather than through state, so a count-up costs no renders.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = value.toLocaleString();
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString();
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={className}>
      {reduce ? value.toLocaleString() : "0"}
    </span>
  );
}

/**
 * The bar above a list: what it is, how many there are, whether it's fetching,
 * and its controls on the right.
 */
export function PanelHeader({
  title,
  count,
  busy,
  children,
}: {
  title: string;
  count?: number;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <h2 className="font-sans text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 font-mono text-[0.6875rem] text-muted-foreground tabular-nums ring-1 ring-foreground/8">
            {count.toLocaleString()}
          </span>
        )}
        {busy && <Loader2 aria-label="Loading" className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      {children && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        aria-label={label}
        maxLength={100}
        className={cn(ADMIN_INPUT, "h-9 pl-9")}
      />
    </div>
  );
}

/** Single-choice filter row. Radio semantics: one option is always selected. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  disabled,
  size = "default",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
  disabled?: boolean;
  size?: "default" | "sm";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-[3px] ring-1 ring-foreground/8 [scrollbar-width:none]",
        size === "sm" ? "h-8" : "h-9",
      )}
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-full shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45 disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" ? "text-xs" : "text-[0.8125rem]",
              checked
                ? "t-surface t-surface-outline text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className="font-mono text-[0.625rem] text-muted-foreground tabular-nums">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Admin marker set beside a name: a pine hairline tag in mono caps, rather
 * than a filled pill competing with the name for attention.
 */
export function AdminTag() {
  return (
    <span className="inline-flex h-[18px] items-center rounded-[5px] px-1.5 font-mono text-[0.625rem] font-medium tracking-[0.08em] text-primary-strong uppercase ring-1 ring-primary/35">
      Admin
    </span>
  );
}

export function PersonCell({
  person,
  isAdmin,
  fallback = "Deleted user",
}: {
  person: AdminPerson | null;
  isAdmin?: boolean;
  fallback?: string;
}) {
  if (!person) {
    return <span className="text-sm text-muted-foreground italic">{fallback}</span>;
  }
  const primary = person.name || `u/${person.anonymousUsername}`;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <GradientAvatar
        seed={person.id}
        initial={primary.charAt(0).toUpperCase() || "?"}
        className="size-7 border-0 text-[0.6875rem] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
      />
      <div className="min-w-0 leading-tight">
        <p className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{primary}</span>
          {isAdmin && <AdminTag />}
        </p>
        <p className="truncate text-xs text-muted-foreground">{person.email}</p>
      </div>
    </div>
  );
}

/** Role as plain text with a leading swatch; the table already says it's a role. */
export function RoleLabel({ role }: { role: AdminUser["role"] }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.8125rem] text-foreground">
      <span
        aria-hidden
        className={cn("size-2 rounded-[3px]", role === "recruiter" ? "bg-chart-3" : "bg-chart-1")}
      />
      {role === "recruiter" ? "Recruiter" : "Candidate"}
    </span>
  );
}

export function StatusLabel({ suspendedAt }: { suspendedAt: string | null }) {
  return suspendedAt ? (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive"
      title={`Suspended ${formatDateTime(suspendedAt)}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
      Suspended
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden className="size-1.5 rounded-full ring-1 ring-muted-foreground/60" />
      Active
    </span>
  );
}

export function SkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: columns }, (_, c) => (
            <TableCell key={c} className="py-3.5">
              {c === 0 ? (
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-40" />
                  </div>
                </div>
              ) : (
                <Skeleton className="h-3 w-16" />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Spans a whole table body; used for empty and error states. */
export function TableMessage({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="py-16">
        {children}
      </TableCell>
    </TableRow>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-1 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-xs flex-col items-center gap-3 text-center">
      <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertIcon className="size-[18px]" />
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load</p>
        <p className="text-xs break-words text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshIcon /> Retry
      </Button>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
  disabled,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-foreground/8 bg-muted/40 px-4 py-2.5">
      <p className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
        {page} / {pages}
        <span className="mx-1.5 opacity-50">·</span>
        {total.toLocaleString()} total
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPage(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPage(page + 1)}
          disabled={disabled || page >= pages}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

/**
 * Destructive confirmation. Can't be dismissed while the action is in flight,
 * so the outcome toast always lands with the dialog already gone.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<boolean>;
}) {
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    const ok = await onConfirm();
    setPending(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent showCloseButton={false} className="rounded-xl border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-base font-semibold tracking-tight">{title}</DialogTitle>
          {description && (
            <DialogDescription className="rounded-lg bg-muted/60 px-3 py-2 break-words ring-1 ring-foreground/8">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 rounded-b-none border-t border-foreground/8 bg-transparent px-0 pt-4 pb-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
