"use client";

import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { toast } from "sonner";
import { Code, ExternalLink, Plus, Sparkles, Trash2 } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { Card } from "@/components/ui/card";
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
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

type Project = {
  _id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveDemo?: string;
  aiStatus?: "pending" | "processing" | "done" | "failed";
  aiEvaluation?: { codeQuality: number; complexity: number; summary: string; extractedSkills?: string[] };
};

/** Must match the backend project model / DTO. */
const PROJECT_TITLE_MAX = 200;
const PROJECT_DESC_MAX = 2000;

/** Same card shell as the profile and upload pages. */
const CARD = "rounded-xl border border-border bg-card shadow-[var(--shadow-xs)]";

/**
 * Sentence-case sans buttons. The shared `ui/button` is uppercase mono for the
 * product chrome, which reads as a different design beside sentence-case
 * labels. Same treatment as the profile and upload pages.
 */
const BTN =
  "cursor-pointer rounded-lg font-sans text-sm font-medium tracking-normal normal-case !shadow-none hover:translate-y-0";

/**
 * Only http(s) links are rendered as links. The server now rejects anything
 * else, but projects saved before that check could still hold a `javascript:`
 * URL, and this page must never turn stored text into a script link.
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
 * Status badge, shown only for states that mean something to the reader.
 * `pending` is hidden: nothing evaluates projects yet, so every project would
 * otherwise wear a permanent "Pending" badge that never resolves.
 */
const STATUS: Record<string, { label: string; dot: string } | undefined> = {
  processing: { label: "Analyzing", dot: "bg-amber-500" },
  done: { label: "Evaluated", dot: "bg-emerald-500" },
  failed: { label: "Evaluation failed", dot: "bg-destructive" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
} as const;

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

  // Delete goes through a confirmation. It used to fire on the first click of
  // an unlabelled trash icon, with no way back.
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
      // Only says what actually happened: no evaluation job exists yet.
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex w-full flex-col gap-6 py-8"
    >
      {/* Masthead, same shape as Profile and Create a post. */}
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Work you want recruiters to see alongside your resume.
            {!loading && list.length > 0 && (
              <span className="tabular-nums">
                {" "}
                · {list.length} {list.length === 1 ? "project" : "projects"}
              </span>
            )}
          </p>
        </div>
        {/* Hidden while empty: the empty state carries the only "add" action
            then, rather than two identical buttons on one screen. */}
        {!isEmpty && (
          <Button onClick={() => setOpen(true)} className={cn(BTN, "w-full sm:w-auto")}>
            <Plus className="size-4" /> New project
          </Button>
        )}
      </header>

      {/* Cards flow with the page. They used to sit in a tinted, fixed-height
          scroll box, so the page scrolled inside a box inside the page. */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl border border-border" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-muted">
            <Code aria-hidden className="size-5 text-muted-foreground" />
          </span>
          <div className="space-y-1">
            <h2 className="font-sans text-base font-semibold tracking-tight">No projects yet</h2>
            <p className="text-sm text-muted-foreground">
              Add something you&apos;ve built to strengthen your profile.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className={BTN}>
            <Plus className="size-4" /> Add a project
          </Button>
        </div>
      ) : (
        <motion.ul
          className="grid gap-4 md:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-label="Your projects"
        >
          <AnimatePresence>
            {list.map((project) => {
              const repo = safeExternalUrl(project.githubUrl);
              const live = safeExternalUrl(project.liveDemo);
              const status = project.aiStatus ? STATUS[project.aiStatus] : undefined;

              return (
                <motion.li key={project._id} variants={itemVariants} exit="exit" layout className="h-full">
                  <Card className={cn(CARD, "flex h-full flex-col")}>
                    {/* Title row: no header bar or tinted strip, just the title,
                        the status when there is one, and the delete action. */}
                    <div className="flex items-start justify-between gap-3 p-5 pb-0">
                      <div className="min-w-0 space-y-1.5">
                        <h3 className="font-sans text-base leading-snug font-semibold tracking-tight break-words text-foreground">
                          {project.title}
                        </h3>
                        {status && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPendingDelete(project)}
                        aria-label={`Delete ${project.title}`}
                        title="Delete project"
                        className="-mt-1 -mr-2 shrink-0 rounded-md text-muted-foreground !shadow-none hover:translate-y-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="flex-1 space-y-4 p-5">
                      {project.description && (
                        <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-line break-words text-muted-foreground">
                          {project.description}
                        </p>
                      )}

                      {project.techStack?.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
                          {project.techStack.map((tech) => (
                            <li key={tech}>
                              <Badge variant="secondary" className="font-normal">
                                {tech}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}

                      {project.aiEvaluation?.summary && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Sparkles aria-hidden className="size-3.5 text-primary-strong" />
                            AI evaluation
                          </p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {project.aiEvaluation.summary}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Links are real anchors styled as buttons. They used to be
                        a <button> inside an <a>, which is invalid HTML and gives
                        keyboard users two tab stops for one link. */}
                    {(repo || live) && (
                      <div className="flex gap-2 border-t border-border px-5 py-3">
                        {repo && (
                          <a
                            href={repo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN, "flex-1")}
                          >
                            <FaGithub aria-hidden className="size-4" /> Repository
                          </a>
                        )}
                        {live && (
                          <a
                            href={live}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN, "flex-1")}
                          >
                            <ExternalLink aria-hidden className="size-4" /> Live demo
                          </a>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      {/* New project. One close path in the footer (no ✕ as well), and closing
          discards the draft. */}
      <Dialog open={open} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-card shadow-[var(--shadow-lg)] sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="font-sans text-base font-semibold tracking-tight">New project</DialogTitle>
            <DialogDescription className="text-xs">
              Shown on your profile and to recruiters.
            </DialogDescription>
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

            {/* A textarea: the field holds up to 2,000 characters, which a
                single-line input made impossible to review. */}
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
    </motion.div>
  );
}
