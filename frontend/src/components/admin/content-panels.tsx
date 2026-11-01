"use client";

import { useState } from "react";
import Link from "next/link";
import { adminApi, type AdminComment, type AdminPage, type AdminResume, type ApiResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CommentIcon, DislikeIcon, ExternalIcon, LikeIcon, TrashIcon } from "@/components/icons/pika";
import {
  ADMIN_CARD,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LIST_SCROLL,
  PanelHeader,
  Pagination,
  PersonCell,
  STICKY_HEAD,
  SearchField,
  SkeletonRows,
  TableMessage,
  formatDate,
  formatRelative,
  runAdminAction,
  useAdminQuery,
  usePagedSearch,
} from "./admin-kit";

const LINK = "font-medium text-foreground underline-offset-4 hover:text-primary-strong hover:underline";
const DATE_CELL = "font-mono text-[0.6875rem] whitespace-nowrap text-muted-foreground tabular-nums";

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={label}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <TrashIcon />
    </Button>
  );
}

/**
 * Shared list plumbing for a searchable, paginated moderation table: the query,
 * the pending-delete target, and stepping back a page when the last row on it
 * goes away.
 */
function useModerationList<T extends { id: string }>(
  name: string,
  load: (params: { page: number; search: string }) => Promise<ApiResult<AdminPage<T>>>,
) {
  const paged = usePagedSearch();
  const { page, term, setPage } = paged;
  const query = useAdminQuery(`${name}|${term}|${page}`, () => load({ page, search: term }));
  const view = query.data ?? (query.error ? undefined : query.previous);
  const [target, setTarget] = useState<T | null>(null);

  const afterDelete = () => {
    if (view?.items.length === 1 && page > 1) setPage(page - 1);
    else query.reload();
  };

  return { ...paged, ...query, view, target, setTarget, afterDelete };
}

/** AI score (0–100) over a meter tinted by band: oxblood, ochre, pine. */
function ScoreMeter({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">Not scored</span>;
  const tone = score >= 70 ? "bg-chart-1" : score >= 45 ? "bg-chart-4" : "bg-chart-5";
  return (
    <div className="w-20">
      <p className="text-xs font-medium text-foreground tabular-nums">
        {score}
        <span className="text-muted-foreground">/100</span>
      </p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-foreground/8">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof LikeIcon; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <Icon className="size-3.5" />
      <span className="sr-only">{label}</span>
      {value}
    </span>
  );
}

const RESUME_COLUMNS = 6;

export function ResumesPanel() {
  const list = useModerationList<AdminResume>("resumes", adminApi.resumes);
  const { view, loading, error } = list;

  return (
    <section className={cn(ADMIN_CARD, "overflow-hidden")}>
      <PanelHeader title="Resumes" count={view?.total} busy={loading && !!view}>
        <SearchField value={list.search} onChange={list.setSearch} label="Search resumes by title" />
      </PanelHeader>

      <Table containerClassName={cn(LIST_SCROLL, "border-t border-foreground/8")} className="min-w-[820px]" aria-busy={loading}>
        <TableHeader className={STICKY_HEAD}>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[28%]">Resume</TableHead>
            <TableHead className="w-[22%]">Owner</TableHead>
            <TableHead>AI score</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody className={cn("transition-opacity", loading && view && "opacity-60")}>
          {error ? (
            <TableMessage columns={RESUME_COLUMNS}>
              <ErrorState message={error} onRetry={list.reload} />
            </TableMessage>
          ) : !view ? (
            <SkeletonRows columns={RESUME_COLUMNS} />
          ) : view.items.length === 0 ? (
            <TableMessage columns={RESUME_COLUMNS}>
              <EmptyState
                title={list.term ? "No matching resumes" : "No resumes yet"}
                hint={list.term ? `Nothing matches “${list.term}”.` : undefined}
              />
            </TableMessage>
          ) : (
            view.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-0">
                  <Link href={`/resume/${r.id}`} className={cn(LINK, "block truncate")} title={r.title}>
                    {r.title}
                  </Link>
                </TableCell>
                <TableCell className="max-w-0">
                  <PersonCell person={r.owner} />
                </TableCell>
                <TableCell>
                  <ScoreMeter score={r.aiScore} />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-3 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    <Stat icon={LikeIcon} value={r.likesCount} label="Likes" />
                    <Stat icon={DislikeIcon} value={r.dislikesCount} label="Dislikes" />
                    <Stat icon={CommentIcon} value={r.commentsCount} label="Comments" />
                  </span>
                </TableCell>
                <TableCell className={DATE_CELL}>{formatDate(r.createdAt)}</TableCell>
                <TableCell className="pr-3">
                  <span className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={<a href={r.fileUrl} target="_blank" rel="noopener noreferrer" />}
                      nativeButton={false}
                      aria-label={`Open file for ${r.title}`}
                      className="text-muted-foreground"
                    >
                      <ExternalIcon />
                    </Button>
                    <DeleteButton label={`Delete ${r.title}`} onClick={() => list.setTarget(r)} />
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {view && view.total > 0 && (
        <Pagination page={view.page} pages={view.pages} total={view.total} onPage={list.setPage} disabled={loading} />
      )}

      <ConfirmDialog
        open={list.target !== null}
        onOpenChange={(open) => !open && list.setTarget(null)}
        title="Delete resume?"
        description={
          <>
            <span className="block font-medium text-foreground">{list.target?.title}</span>
            Its reactions and comments go with it.
          </>
        }
        confirmLabel="Delete resume"
        onConfirm={async () => {
          const target = list.target;
          if (!target) return false;
          const ok = await runAdminAction(() => adminApi.deleteResume(target.id), "Resume deleted");
          if (ok) list.afterDelete();
          return ok;
        }}
      />
    </section>
  );
}

const COMMENT_COLUMNS = 5;

export function CommentsPanel() {
  const list = useModerationList<AdminComment>("comments", adminApi.comments);
  const { view, loading, error } = list;

  return (
    <section className={cn(ADMIN_CARD, "overflow-hidden")}>
      <PanelHeader title="Comments" count={view?.total} busy={loading && !!view}>
        <SearchField value={list.search} onChange={list.setSearch} label="Search comment text" />
      </PanelHeader>

      <Table containerClassName={cn(LIST_SCROLL, "border-t border-foreground/8")} className="min-w-[820px]" aria-busy={loading}>
        <TableHeader className={STICKY_HEAD}>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[38%]">Comment</TableHead>
            <TableHead className="w-[22%]">Author</TableHead>
            <TableHead className="w-[20%]">On</TableHead>
            <TableHead>Posted</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody className={cn("transition-opacity", loading && view && "opacity-60")}>
          {error ? (
            <TableMessage columns={COMMENT_COLUMNS}>
              <ErrorState message={error} onRetry={list.reload} />
            </TableMessage>
          ) : !view ? (
            <SkeletonRows columns={COMMENT_COLUMNS} />
          ) : view.items.length === 0 ? (
            <TableMessage columns={COMMENT_COLUMNS}>
              <EmptyState
                title={list.term ? "No matching comments" : "No comments yet"}
                hint={list.term ? `Nothing matches “${list.term}”.` : undefined}
              />
            </TableMessage>
          ) : (
            view.items.map((c) => {
              const net = c.upvotesCount - c.downvotesCount;
              return (
                <TableRow key={c.id}>
                  <TableCell className="max-w-0">
                    <p className="line-clamp-2 text-sm break-words whitespace-normal text-foreground">{c.text}</p>
                    <span className="mt-1 flex items-center gap-2 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                      {c.isReply && <span className="rounded bg-muted px-1.5 py-px ring-1 ring-foreground/8">reply</span>}
                      <span className={cn(net < 0 && "text-destructive")} title="Net votes">
                        {net > 0 ? `+${net}` : net} votes
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0">
                    <PersonCell person={c.author} />
                  </TableCell>
                  <TableCell className="max-w-0">
                    {c.resume ? (
                      <Link href={`/resume/${c.resume.id}`} className={cn(LINK, "block truncate text-[0.8125rem]")} title={c.resume.title}>
                        {c.resume.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={DATE_CELL} title={formatDate(c.createdAt)}>
                    {formatRelative(c.createdAt)}
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <DeleteButton label="Delete comment" onClick={() => list.setTarget(c)} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {view && view.total > 0 && (
        <Pagination page={view.page} pages={view.pages} total={view.total} onPage={list.setPage} disabled={loading} />
      )}

      <ConfirmDialog
        open={list.target !== null}
        onOpenChange={(open) => !open && list.setTarget(null)}
        title="Delete comment?"
        description={
          <>
            <span className="line-clamp-4 text-foreground">{list.target?.text}</span>
            <span className="mt-1.5 block text-xs">If others replied, it stays as a placeholder so their replies survive.</span>
          </>
        }
        confirmLabel="Delete comment"
        onConfirm={async () => {
          const target = list.target;
          if (!target) return false;
          const ok = await runAdminAction(() => adminApi.deleteComment(target.id), "Comment deleted");
          if (ok) list.afterDelete();
          return ok;
        }}
      />
    </section>
  );
}
