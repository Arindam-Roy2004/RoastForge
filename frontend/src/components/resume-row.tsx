"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ResumeRowProps = {
  id: string;
  title?: string;
  /** Optional in practice — plenty of stored rows have no version. */
  version?: number;
  status?: string;
  overall?: number;
  createdAt?: string;
  candidateAlias?: string;
};

/**
 * A resume as a list row, in the shape of the reference dashboard's "Recent
 * Documents" list.
 *
 * Anatomy taken from that reference: a tinted, padded icon tile, then the name
 * in `font-medium` with a single muted metadata line under it, and a trailing
 * control on the right — the whole row being a `p-3 rounded-lg hover:bg-muted`
 * hit area with a separator beneath.
 *
 * Two deliberate departures:
 *
 *  - The icon tile is brand-tinted (`bg-primary/10`) rather than the reference's
 *    `bg-blue-100`. Blue isn't in this palette, and a stray accent colour in a
 *    list of five rows is exactly the kind of thing that makes a page look
 *    assembled from parts.
 *  - The trailing control is a chevron, not the reference's `…` dropdown. This
 *    row *is* a link to the resume, and there's no dropdown-menu primitive in
 *    this project — a `…` button here would be dead UI that looks clickable. The
 *    chevron occupies the same slot and says what the row actually does.
 *
 * The metadata line uses the reference's `gap-4` spacing rather than dot
 * separators, which is what lets three or four short values read as columns.
 */
export function ResumeRow({ id, title, version, status, overall, createdAt, candidateAlias }: ResumeRowProps) {
  return (
    <Link
      href={`/resume/${id}`}
      className="group flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2">
          <FileText aria-hidden className="size-5 text-primary-strong" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {/* Last resort avoids "Resume vundefined" now that version is optional. */}
            {title || candidateAlias || (version != null ? `Resume v${version}` : "Untitled resume")}
          </p>
          <div className="mt-0.5 flex items-center gap-4 text-xs text-muted-foreground">
            {/* Guarded: `version` is optional on the API row, and an unguarded
                `v{version}` rendered a bare "v" with nothing after it for every
                resume that lacked one. */}
            {version != null && <span className="tabular-nums">v{version}</span>}
            {status && <span className="capitalize">{status}</span>}
            {createdAt && (
              <span className="tabular-nums">
                {new Date(createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {overall != null ? (
          <Badge className="font-normal tabular-nums">{overall}</Badge>
        ) : (
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            Unscored
          </Badge>
        )}
        <ChevronRight
          aria-hidden
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
