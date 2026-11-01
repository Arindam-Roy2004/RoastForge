"use client";

import { useState } from "react";
import { adminApi, type AdminUser, type AdminUserFilter } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRightIcon } from "@/components/icons/pika";
import {
  ADMIN_CARD,
  EmptyState,
  ErrorState,
  LIST_SCROLL,
  PanelHeader,
  Pagination,
  PersonCell,
  RoleLabel,
  STICKY_HEAD,
  SearchField,
  SegmentedControl,
  SkeletonRows,
  StatusLabel,
  TableMessage,
  formatDate,
  useAdminQuery,
  usePagedSearch,
} from "./admin-kit";
import { ManageUserSheet } from "./manage-user-sheet";

const FILTERS: { value: AdminUserFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "candidates", label: "Candidates" },
  { value: "recruiters", label: "Recruiters" },
  { value: "admins", label: "Admins" },
  { value: "suspended", label: "Suspended" },
];

const COLUMNS = 6;

/** Talent composite (0–100) as a figure over a hairline meter. */
function TalentMeter({ user }: { user: AdminUser }) {
  if (user.role === "recruiter") return <span className="text-muted-foreground">—</span>;
  const value = Math.max(0, Math.min(100, user.talentComposite));
  return (
    <div className="w-20">
      <p className="text-xs font-medium text-foreground tabular-nums">{value.toFixed(1)}</p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-foreground/8">
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function UsersPanel() {
  const [filter, setFilter] = useState<AdminUserFilter>("all");
  const { search, setSearch, term, page, setPage } = usePagedSearch(filter);
  // `selected` outlives `open` so the sheet keeps its content while it slides out.
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);

  const { data, previous, error, loading, reload } = useAdminQuery(`users|${filter}|${term}|${page}`, () =>
    adminApi.users({ page, search: term, filter }),
  );
  const view = data ?? (error ? undefined : previous);

  const openUser = (u: AdminUser) => {
    setSelected(u);
    setOpen(true);
  };

  return (
    <section className={cn(ADMIN_CARD, "overflow-hidden")}>
      <PanelHeader title="Members" count={view?.total} busy={loading && !!view}>
        <SearchField value={search} onChange={setSearch} label="Search members by name, email or alias" />
        <SegmentedControl value={filter} onChange={setFilter} options={FILTERS} label="Filter members" />
      </PanelHeader>

      <Table containerClassName={cn(LIST_SCROLL, "border-t border-foreground/8")} className="min-w-[760px]" aria-busy={loading}>
        <TableHeader className={STICKY_HEAD}>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[34%]">Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Talent</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody className={cn("transition-opacity", loading && view && "opacity-60")}>
          {error ? (
            <TableMessage columns={COLUMNS}>
              <ErrorState message={error} onRetry={reload} />
            </TableMessage>
          ) : !view ? (
            <SkeletonRows columns={COLUMNS} />
          ) : view.items.length === 0 ? (
            <TableMessage columns={COLUMNS}>
              <EmptyState
                title={term || filter !== "all" ? "No matching members" : "No members yet"}
                hint={term ? `Nothing matches “${term}”.` : undefined}
              />
            </TableMessage>
          ) : (
            view.items.map((u) => (
              <TableRow
                key={u.id}
                onClick={() => openUser(u)}
                data-state={open && selected?.id === u.id ? "selected" : undefined}
                className="cursor-pointer data-[state=selected]:bg-accent/70"
              >
                <TableCell className="max-w-0">
                  <PersonCell person={u} isAdmin={u.isAdmin} />
                </TableCell>
                <TableCell>
                  <RoleLabel role={u.role} />
                </TableCell>
                <TableCell>
                  <StatusLabel suspendedAt={u.suspendedAt} />
                </TableCell>
                <TableCell>
                  <TalentMeter user={u} />
                </TableCell>
                <TableCell className="font-mono text-[0.6875rem] whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatDate(u.createdAt)}
                </TableCell>
                <TableCell className="pr-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUser(u);
                    }}
                    aria-label={`Open ${u.name || u.email}`}
                  >
                    <ChevronRightIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {view && view.total > 0 && (
        <Pagination page={view.page} pages={view.pages} total={view.total} onPage={setPage} disabled={loading} />
      )}

      <ManageUserSheet
        user={selected}
        open={open}
        onOpenChange={setOpen}
        onChanged={(removed) => {
          // Removing the only row on a later page would strand the view on an empty page.
          if (removed && view?.items.length === 1 && page > 1) setPage(page - 1);
          else reload();
        }}
      />
    </section>
  );
}
