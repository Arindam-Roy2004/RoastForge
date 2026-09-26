"use client";

import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { toast } from "sonner";
import { Code, ExternalLink, Plus, Trash2 } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Project = {
  _id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveDemo?: string;
  aiStatus?: "pending" | "processing" | "done" | "failed";
};

/** Must match the backend project model / DTO. */
const PROJECT_TITLE_MAX = 200;
const PROJECT_DESC_MAX = 2000;

/** Same card shell and header bar as the profile page. */
const CARD = "rounded-xl border border-border bg-card shadow-[var(--shadow-xs)]";
const CARD_HEAD =
  "flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border px-5 py-4";

/**
 * Sentence-case sans buttons. The shared `ui/button` is uppercase mono for the
 * product chrome, which reads as a different design beside sentence-case
 * labels. Same treatment as the profile and upload pages.
 */
const BTN =
  "cursor-pointer rounded-lg font-sans text-sm font-medium tracking-normal normal-case !shadow-none hover:translate-y-0";

/** Square icon action in a row (repo, live demo, delete). */
const ROW_ACTION =
  "size-8 shrink-0 rounded-md px-0 text-muted-foreground !shadow-none hover:translate-y-0 hover:bg-muted hover:text-foreground";

/**
 * Only http(s) links are rendered as links. The server rejects anything else,
 * but projects saved before that check could still hold a `javascript:` URL,
 * and this page must never turn stored text into a script link.
 */
function safeExternalUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Status, shown only when it means something. `pending` is hidden: nothing
 * evaluates projects yet, so every project would otherwise carry a permanent
 * "Pending" that never resolves.
 */
const STATUS: Record<string, { label: string; dot: string } | undefined> = {
  processing: { label: "Analyzing", dot: "bg-amber-500" },
  done: { label: "Evaluated", dot: "bg-emerald-500" },
  failed: { label: "Evaluation failed", dot: "bg-destructive" },
};

/** Label tied to its control by `htmlFor`, with optional right-aligned meta. */
function FormField({
  id,
  label,
  optional,
  hint,
  meta,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
        </label>
        {meta}
      </div>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One project as a list row — the same anatomy as "Your resumes" on the
 * profile page: tinted icon tile, name, then muted one-line details. Every text
 * line truncates, so a long description or a big tech stack can't make one row
 * taller than the rest.
 */
function ProjectRow({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const repo = safeExternalUrl(project.githubUrl);
  const live = safeExternalUrl(project.liveDemo);
  const status = project.aiStatus ? STATUS[project.aiStatus] : undefined;
  const stack = project.techStack?.filter(Boolean) ?? [];

  return (
    <div className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/60">
      <div className="shrink-0 self-start rounded-lg bg-primary/10 p-2">
        <Code aria-hidden className="size-5 text-primary-strong" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{project.title}</p>
        {project.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.description}</p>
        )}
        {(stack.length > 0 || status) && (
          <p className="mt-1 flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
            {stack.length > 0 && <span className="truncate">{stack.join(" · ")}</span>}
            {status && (
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Links are real anchors styled as buttons — never a <button> inside an
          <a>, which is invalid HTML and doubles the tab stops. */}
      <div className="flex shrink-0 items-center gap-0.5">
        {repo && (
          <a
            href={repo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.title} repository`}
            title="Repository"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), ROW_ACTION)}
          >
            <FaGithub aria-hidden className="size-4" />
          </a>
        )}
        {live && (
          <a
            href={live}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.title} live demo`}
            title="Live demo"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), ROW_ACTION)}
          >
            <ExternalLink aria-hidden className="size-4" />
          </a>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label={`Delete ${project.title}`}
          title="Delete project"
          className={cn(ROW_ACTION, "hover:bg-destructive/10 hover:text-destructive")}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [list, setList] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [stack, setStack] = useState("");
  const [gh, setGh] = useState("");
  const [demo, setDemo] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete goes through a confirmation instead of firing on the first click.
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Project[]>("/api/project");
      setList(res.data || []);
    } catch {
      /* not logged in */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role === "recruiter") {
      router.replace("/recruiter");
    }
  }, [authLoading, user?.role, router]);

  function resetForm() {
    setTitle("");
    setDesc("");
    setStack("");
    setGh("");
    setDemo("");
  }

  // Closing the dialog any way (Esc, overlay, Cancel) discards the draft, so
  // reopening it never shows a half-finished project from last time.
  function setDialogOpen(next: boolean) {
    if (!next && saving) return;
    setOpen(next);
    if (!next) resetForm();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch("/api/project", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim(),
          techStack: Array.from(new Set(stack.split(",").map((s) => s.trim()).filter(Boolean))),
          githubUrl: gh.trim() || undefined,
          liveDemo: demo.trim() || undefined,
        }),
      });
      toast.success("Project added");
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add project");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/project/${pendingDelete._id}`, { method: "DELETE" });
      toast.success("Project deleted");
      setPendingDelete(null);
      load();
    } catch {
      toast.error("Could not delete project");
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user?.role === "recruiter") {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  // useRequireAuth has already scheduled the redirect to /login.
  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  const isEmpty = !loading && list.length === 0;

  return (
    // Narrower than the page container: a list of short rows stretched across
    // 80rem left most of every row empty.
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="text-center">
        <h1 className="font-sans text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Work you want recruiters to see alongside your resume.
        </p>
      </header>

      {/* One bounded card, like "Your resumes" on the profile page. The list
          scrolls inside it, so adding projects never makes the page longer. */}
      <Card className={CARD}>
        <CardHeader className={CARD_HEAD}>
          <div className="flex items-center gap-2">
            <CardTitle className="font-sans text-base font-semibold tracking-tight">Your projects</CardTitle>
            {!loading && list.length > 0 && (
              <Badge variant="secondary" className="font-normal tabular-nums">
                {list.length}
              </Badge>
            )}
          </div>
          {/* Hidden while empty: the empty state holds the only "add" action
              then, rather than two identical buttons in one card. */}
          {!loading && !isEmpty && (
            <Button size="sm" onClick={() => setOpen(true)} className={BTN}>
              <Plus className="size-4" /> New project
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : isEmpty ? (
            // shadcn's Empty pattern: a small icon tile, a title, one line of
            // description and a single action, held to a narrow column. Sized
            // to its content rather than stretched into a tall dashed box.
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Code aria-hidden className="size-5 text-foreground" />
              </span>
              <div className="space-y-1">
                <h2 className="font-sans text-base font-medium tracking-tight">No projects yet</h2>
                <p className="text-sm text-muted-foreground">
                  Add something you&apos;ve built to strengthen your profile.
                </p>
              </div>
              <Button size="sm" onClick={() => setOpen(true)} className={BTN}>
                <Plus className="size-4" /> Add a project
              </Button>
            </div>
          ) : (
            /* Scrolls past about five rows. `scrollbar-gutter:stable` reserves
               the bar's width so rows don't shift when the list crosses the cap,
               and `pr-1` keeps the row actions off the bar. */
            <ul
              aria-label="Your projects"
              className="max-h-[420px] space-y-3 overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]"
            >
              {list.map((project, index) => (
                <li
                  key={project._id}
                  className={cn(index < list.length - 1 && "border-b border-border/50 pb-3")}
                >
                  <ProjectRow project={project} onDelete={() => setPendingDelete(project)} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* New project. One close path in the footer, and closing discards the draft. */}
      <Dialog open={open} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-card shadow-[var(--shadow-lg)] sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="font-sans text-base font-semibold tracking-tight">New project</DialogTitle>
            <DialogDescription className="text-xs">Shown on your profile and to recruiters.</DialogDescription>
          </DialogHeader>

          <form onSubmit={create} className="space-y-5">
            <FormField
              id="project-title"
              label="Name"
              meta={
                <span className="text-xs tabular-nums text-muted-foreground">
                  {title.length}/{PROJECT_TITLE_MAX}
                </span>
              }
            >
              <Input
                id="project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={PROJECT_TITLE_MAX}
                placeholder="e.g. RoastForge"
                autoFocus
              />
            </FormField>

            <FormField
              id="project-description"
              label="Description"
              optional
              meta={
                <span
                  className={cn(
                    "text-xs tabular-nums text-muted-foreground",
                    PROJECT_DESC_MAX - desc.length <= 100 && "text-destructive",
                  )}
                >
                  {desc.length}/{PROJECT_DESC_MAX}
                </span>
              }
            >
              <Textarea
                id="project-description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={PROJECT_DESC_MAX}
                placeholder="What does it do, and what was hard about building it?"
              />
            </FormField>

            <FormField id="project-stack" label="Tech stack" optional hint="Comma-separated, e.g. React, Node.js, MongoDB.">
              <Input
                id="project-stack"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                aria-describedby="project-stack-hint"
                placeholder="React, Node.js"
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="project-github" label="Repository URL" optional>
                <Input
                  id="project-github"
                  type="url"
                  inputMode="url"
                  value={gh}
                  onChange={(e) => setGh(e.target.value)}
                  placeholder="https://github.com/…"
                />
              </FormField>
              <FormField id="project-demo" label="Live demo URL" optional>
                <Input
                  id="project-demo"
                  type="url"
                  inputMode="url"
                  value={demo}
                  onChange={(e) => setDemo(e.target.value)}
                  placeholder="https://…"
                />
              </FormField>
            </div>

            <DialogFooter className="mx-0 mb-0 border-t border-border bg-transparent px-0 pt-4 pb-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className={BTN}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !title.trim()} aria-busy={saving} className={BTN}>
                {saving ? "Adding…" : "Add project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation. */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="rounded-xl border border-border bg-card shadow-[var(--shadow-lg)] sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-sans text-base font-semibold tracking-tight">Delete project?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.title}</span> will be removed
              from your profile. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 border-t border-border bg-transparent px-0 pt-4 pb-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
              className={BTN}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              aria-busy={deleting}
              className={BTN}
            >
              {deleting ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
