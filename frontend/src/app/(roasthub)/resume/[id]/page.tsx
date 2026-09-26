"use client";

import { EnhancedComment } from "@/components/enhanced-comment";
import { ResumeReactionControls } from "@/components/resume-reaction-controls";
import { cn } from "@/lib/utils";
import { resumeApi, commentApi, analysisApi, POST_BODY_MAX, type Resume, type Comment, type RoastData } from "@/lib/api";
import { enqueueResumeReaction, flushQueuedResumeReactions } from "@/lib/resume-reaction-sync";
import { coalesceVerdictBars, isCompleteRoastPayload } from "@/lib/verdict-dimensions";
import { RoastScoreDial, RoastVerdictRadar } from "@/components/roast-verdict";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, ArrowLeft, RefreshCw, Zap, Trash2, Sparkles, AlertTriangle, Briefcase, Maximize2, Minimize2, Pencil } from "lucide-react";
import FlameIcon from "@/components/icons/flame-icon";
import { useAuth } from "@/store/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

/** Sentence-case sans buttons for the body editor, matching the upload composer. */
const BODY_BTN = "rounded-lg font-sans text-sm font-medium tracking-normal normal-case !shadow-none hover:translate-y-0";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";

export default function ResumeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [resume, setResume] = useState<Resume | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<string>("comment");
  const [posting, setPosting] = useState(false);
  const [reactionPending, setReactionPending] = useState(false);

  // AI Roast state
  const [roastData, setRoastData] = useState<RoastData | null>(null);
  const [roasting, setRoasting] = useState(false);
  const [roastError, setRoastError] = useState("");

  // Stack swap state — chat open by default (AI collapsed to a header strip).
  // Click AI strip header → AI expands with content, chat shrinks to its own strip.
  // Persisted per-resume via localStorage.
  const swapStorageKey = `resume:${id}:chatOpen`;
  const [chatOpen, setChatOpen] = useState(true);
  const [swapHydrated, setSwapHydrated] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(swapStorageKey);
      if (stored === "0") setChatOpen(false);
      else setChatOpen(true);
    } catch { /* ignore */ }
    setSwapHydrated(true);
  }, [swapStorageKey]);
  useEffect(() => {
    if (!swapHydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(swapStorageKey, chatOpen ? "1" : "0");
    } catch { /* ignore */ }
  }, [chatOpen, swapHydrated, swapStorageKey]);
  const toggleSwap = useCallback(() => setChatOpen((v) => !v), []);

  const isOwner = Boolean(
    resume && (resume.isOwner === true || (user && user.id === resume.userId?._id)),
  );

  // Post body (stored as `blurb`). Owners can edit it after posting; the title
  // stays fixed, as on Reddit.
  const [bodyEditing, setBodyEditing] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");
  const [bodySaving, setBodySaving] = useState(false);

  const startBodyEdit = () => {
    setBodyDraft(resume?.blurb ?? "");
    setBodyEditing(true);
  };

  // Optimistic: the page shows the new body immediately, and rolls back if the
  // save fails. The editor stays open on failure so the draft isn't lost.
  const saveBody = async () => {
    if (!resume) return;
    const next = bodyDraft.trim();
    const prev = resume.blurb ?? "";
    if (next === prev) {
      setBodyEditing(false);
      return;
    }
    setBodySaving(true);
    setResume((r) => (r ? { ...r, blurb: next } : r));
    try {
      await resumeApi.update(id, { blurb: next });
      setBodyEditing(false);
      toast.success(next ? "Description saved" : "Description removed");
    } catch (err) {
      setResume((r) => (r ? { ...r, blurb: prev } : r));
      toast.error(err instanceof Error ? err.message : "Could not save description");
    } finally {
      setBodySaving(false);
    }
  };

  const inferReaction = useCallback((r: Resume | null): "like" | "dislike" | null => {
    if (!r) return null;
    if (r.viewerReaction === "like" || r.viewerReaction === "dislike") return r.viewerReaction;
    if (r.isLiked) return "like";
    if (r.isDisliked) return "dislike";
    return null;
  }, []);

  const applyReaction = useCallback(
    (r: Resume, reaction: "like" | "dislike"): Resume => {
      const prev = inferReaction(r);
      const next = prev === reaction ? null : reaction;
      return {
        ...r,
        viewerReaction: next,
        isLiked: next === "like",
        isDisliked: next === "dislike",
        likesCount: Math.max(0, (r.likesCount ?? 0) + (next === "like" ? 1 : 0) - (prev === "like" ? 1 : 0)),
        dislikesCount: Math.max(0, (r.dislikesCount ?? 0) + (next === "dislike" ? 1 : 0) - (prev === "dislike" ? 1 : 0)),
      };
    },
    [inferReaction],
  );

  const loadResume = useCallback(async () => {
    try {
      const res = await resumeApi.get(id);
      setResume(res.data || null);
    } catch {
      setResume(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    try {
      const res = await commentApi.list(id);
      setComments(res.data || []);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { loadResume(); loadComments(); }, [loadResume, loadComments]);

  useEffect(() => {
    setRoastData(null);
    setRoastError("");
    setRoasting(false);
  }, [id]);

  useEffect(() => {
    if (!resume?.aiRoast || !isOwner) return;
    if (!isCompleteRoastPayload(resume.aiRoast)) return;
    setRoastData((prev) => {
      if (prev && isCompleteRoastPayload(prev)) return prev;
      const ar = resume.aiRoast!;
      return {
        cached: true,
        score: ar.score,
        verdictBars: coalesceVerdictBars(ar.verdictBars),
      };
    });
  }, [resume, isOwner]);

  useEffect(() => {
    if (roastData != null && !isCompleteRoastPayload(roastData)) {
      setRoastData(null);
    }
  }, [roastData]);

  useEffect(() => {
    if (isOwner && commentType !== "comment") {
      setCommentType("comment");
    }
  }, [isOwner, commentType]);

  async function fetchRoast() {
    setRoasting(true);
    setRoastError("");
    try {
      const res = await analysisApi.roast(id);
      if (res.data) {
        setRoastData(res.data);
        void loadResume();
        if (res.data.cached) {
          toast.success("Loaded cached roast — resume unchanged since last analysis.");
        } else {
          toast.success("Fresh roast generated.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to forge the roast. Try again.";
      setRoastError(msg);
      toast.error(msg);
    } finally {
      setRoasting(false);
    }
  }

  async function reactOnResume(reaction: "like" | "dislike") {
    if (!resume) return;
    if (!user) {
      toast.error("Please log in to react.");
      router.push("/login");
      return;
    }
    if (resume.userId?._id === user.id) {
      toast.error("You cannot react to your own resume.");
      return;
    }

    const prev = resume;
    const optimistic = applyReaction(prev, reaction);
    const optimisticReaction = optimistic.viewerReaction;
    setReactionPending(true);
    setResume(optimistic);

    try {
      const res = await resumeApi.react(id, reaction);
      if (res.data) {
        setResume((curr) =>
          curr
            ? {
                ...curr,
                viewerReaction: res.data!.viewerReaction,
                isLiked: res.data!.isLiked,
                isDisliked: res.data!.isDisliked,
                likesCount: res.data!.likesCount,
                dislikesCount: res.data!.dislikesCount,
              }
            : curr,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save reaction.";
      const networkish =
        typeof navigator !== "undefined"
        && (!navigator.onLine || /network|failed to fetch|load failed/i.test(message));
      if (networkish && optimisticReaction) {
        enqueueResumeReaction(id, optimisticReaction);
        toast.error("Offline detected. Reaction queued and will sync when you're online.");
      } else {
        setResume(prev);
        toast.error(message);
      }
    } finally {
      setReactionPending(false);
    }
  }

  useEffect(() => {
    const flush = async () => {
      const synced = await flushQueuedResumeReactions();
      if (synced > 0) {
        await loadResume();
        toast.success(`Synced ${synced} queued reaction${synced > 1 ? "s" : ""}.`);
      }
    };
    void flush();
    const onOnline = () => { void flush(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [loadResume]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const finalText = commentType === "comment" ? commentText.trim() : `[${commentType.toUpperCase()}] ${commentText.trim()}`;
      await commentApi.add(id, { text: finalText });
      setCommentText("");
      setCommentType("comment");
      loadComments();
      toast.success("Comment posted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Post failed");
    } finally {
      setPosting(false);
    }
  }

  async function deleteThisResume() {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    try {
      await resumeApi.delete(id as string);
      toast.success("Resume deleted");
      router.push("/profile");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete resume");
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-16 w-3/4 border border-border rounded-lg" />
        <Skeleton className="h-125 w-full border border-border rounded-lg" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="w-full py-8 text-center">
        <h1 className="text-4xl font-heading mb-6">Resume not found</h1>
        <Button onClick={() => router.push("/")} className="border border-border rounded-lg shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-lg tracking-wide">
          Back Home
        </Button>
      </div>
    );
  }

  const isPdf = resume.fileType === "pdf";

  const panelHeaderClass =
    "min-h-14 shrink-0 px-4 flex items-center justify-between gap-3 border-b border-border bg-primary text-primary-foreground font-heading tracking-wide";

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* min-w-0 + flex-1 so a long body wraps inside this column instead of
              widening it and pushing the reaction/actions group off the row. */}
          <div className="min-w-0 space-y-4 md:flex-1">
            <Button variant="outline" onClick={() => router.back()} className="border border-border shadow-[var(--shadow-2xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-xs h-8 px-3">
              <ArrowLeft className="w-3 h-3 mr-1.5" /> Back
            </Button>

            <div>
              <h1 className="text-3xl md:text-5xl font-heading tracking-tighter mb-1">
                {resume.title || resume.candidateAlias || resume.userId?.anonymousUsername || "Untitled Resume"}
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <span className="font-mono text-xs tracking-tight">u/{resume.candidateAlias || resume.userId?.anonymousUsername || "Anonymous"}</span>
                <span className="text-border">&middot;</span>
                <span className="font-mono text-xs font-bold text-foreground">v{resume.version || 1}</span>
              </p>

              {/* Post body, directly under the title as on Reddit. Plain text
                  rendered as a React child (so it's escaped), with the author's
                  line breaks kept. Posts without a body render nothing here —
                  no empty gap for older posts. */}
              {bodyEditing ? (
                <div className="mt-4 max-w-3xl space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="post-body-edit" className="text-sm font-medium text-foreground">
                      Description
                    </label>
                    <span
                      id="post-body-edit-count"
                      className={cn(
                        "text-xs tabular-nums text-muted-foreground",
                        POST_BODY_MAX - bodyDraft.length <= 100 && "text-destructive",
                      )}
                    >
                      {bodyDraft.length}/{POST_BODY_MAX}
                    </span>
                  </div>
                  <Textarea
                    id="post-body-edit"
                    value={bodyDraft}
                    onChange={(e) => setBodyDraft(e.target.value)}
                    maxLength={POST_BODY_MAX}
                    placeholder="What should people focus on?"
                    aria-describedby="post-body-edit-count"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBodyEditing(false)}
                      disabled={bodySaving}
                      className={BODY_BTN}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveBody()}
                      disabled={bodySaving || bodyDraft.trim() === (resume.blurb ?? "")}
                      aria-busy={bodySaving}
                      className={BODY_BTN}
                    >
                      {bodySaving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {resume.blurb && (
                    <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90 md:text-base">
                      {resume.blurb}
                    </p>
                  )}
                  {isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={startBodyEdit}
                      className={cn(BODY_BTN, "mt-2 -ml-3 text-muted-foreground")}
                      data-testid="button-edit-post-body"
                    >
                      <Pencil className="size-3.5" />
                      {resume.blurb ? "Edit description" : "Add a description"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <ResumeReactionControls
              likesCount={resume.likesCount ?? 0}
              dislikesCount={resume.dislikesCount ?? 0}
              viewerReaction={inferReaction(resume)}
              pending={reactionPending}
              disabled={!user || isOwner}
              onReact={(reaction) => { void reactOnResume(reaction); }}
            />
            {user?.role === "recruiter" && resume.userId?._id && (
              <Link href={`/recruiter/candidate/${resume.userId._id}`}>
                <Button
                  variant="secondary"
                  className="border border-border shadow-[var(--shadow-2xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-xs h-9"
                  data-testid="link-recruiter-portfolio"
                >
                  <Briefcase className="w-3 h-3 mr-1.5" /> Candidate portfolio
                </Button>
              </Link>
            )}
            {isOwner && (
              <Button variant="destructive" onClick={deleteThisResume} className="border border-border shadow-[var(--shadow-2xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-xs h-9">
                <Trash2 className="w-3 h-3 mr-1.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="w-full min-w-0 border-b border-border" aria-hidden />
      </div>

      <div
        className={cn(
          "grid grid-cols-1 items-start gap-6 lg:[--panel-h:clamp(740px,calc(100vh-12.5rem),960px)]",
          isOwner ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.95fr)]" : "lg:grid-cols-[minmax(0,1.55fr)_minmax(380px,1.05fr)]",
        )}
      >
        {/* Center: PDF Viewer */}
        <div className="order-1 border border-border bg-muted overflow-hidden flex flex-col h-[540px] lg:h-[var(--panel-h)]">
          <div className={cn(panelHeaderClass, "text-sm ")}>
             <div className="flex items-center gap-2.5 min-w-0">
               <FileText className="w-5 h-5 shrink-0" strokeWidth={2.5} /> <span className="truncate">Resume PDF</span>
             </div>
             <a
               href={resume.fileUrl}
               target="_blank"
               rel="noreferrer"
               className={cn(
                 buttonVariants({ variant: "secondary", size: "sm" }),
                 "border border-border bg-background text-foreground shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-[10px] h-9 px-3.5 font-bold shrink-0"
               )}
             >
               Open external
             </a>
          </div>
          <div className="flex-1 bg-white relative min-h-0">
            {resume.fileType === "pdf" ? (
              <iframe src={resume.fileUrl} className="absolute inset-0 w-full h-full border-none" title="Resume PDF" />
            ) : (
              <img src={resume.fileUrl} className="w-full h-full object-contain" alt="Resume" />
            )}
          </div>
        </div>

        {isOwner ? (
          <LayoutGroup id={`resume-${id}-swap`}>
            <div className="order-2 hidden lg:flex lg:flex-col gap-6 lg:h-[var(--panel-h)] lg:min-h-0">
              {/* AI Roast — always sized to its content so the card never leaves
                  dead space below the last row. The chat panel absorbs whatever
                  height is left over. */}
              <motion.div
                layout
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-none min-h-0"
              >
                <Card
                  className={cn(
                    "border border-border rounded-lg shadow-[var(--shadow-lg)] flex flex-col h-full w-full bg-card overflow-hidden",
                  )}
                  data-collapsed={chatOpen}
                >
                  <CardHeader
                    role="button"
                    tabIndex={0}
                    onClick={toggleSwap}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSwap(); } }}
                    aria-label={chatOpen ? "Expand AI analysis" : "Collapse AI analysis"}
                    aria-expanded={!chatOpen}
                    className={cn(panelHeaderClass, "cursor-pointer select-none", chatOpen && "border-b-0")}
                  >
                    <CardTitle className="text-base flex items-center gap-2.5 tracking-tight text-primary-foreground truncate">
                      <Sparkles className="w-5 h-5 shrink-0" strokeWidth={2.5} /> AI Analysis
                    </CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className="border border-border rounded-lg shadow-[var(--shadow-xs)] font-heading font-bold text-[10px] uppercase bg-background text-foreground px-2.5 py-1"
                      >
                        {chatOpen ? "Click to expand" : "Open chat"}
                      </Badge>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSwap(); }}
                        aria-label={chatOpen ? "Expand AI analysis" : "Collapse AI analysis"}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-border bg-background/10 text-primary-foreground hover:bg-background/20 transition-colors"
                      >
                        {chatOpen ? <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />}
                      </button>
                    </div>
                  </CardHeader>
                  <AnimatePresence initial={false}>
                    {!chatOpen && (
                      <motion.div
                        key="ai-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                          opacity: { duration: 0.22, ease: "easeOut" },
                        }}
                        className="overflow-hidden"
                      >
                        <CardContent className="p-0 flex flex-col bg-background">
                          <AnimatePresence mode="wait">
                            {/* State: No roast yet */}
                            {!isCompleteRoastPayload(roastData) && !roasting && !roastError && (
                              <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-4 p-4"
                              >
                                <div className="flex flex-col items-center justify-center gap-4 px-1 py-6">
                                  <div className="w-28 h-28 rounded-full border-[5px] border-dashed border-border flex items-center justify-center bg-muted/40 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                                    <Zap className="w-10 h-10 text-foreground/70" strokeWidth={2} />
                                  </div>
                                  <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed max-w-[18rem]">
                                    {isPdf
                                      ? "No roast yet. Hit the button to unleash the AI."
                                      : "AI roast is only available for PDF resumes."}
                                  </p>
                                </div>
                                {isPdf && isOwner && user && (
                                  <Button
                                    onClick={fetchRoast}
                                    className="w-full border border-border shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading tracking-wide bg-background text-foreground hover:bg-muted/80 text-sm py-6 min-h-[3.25rem]"
                                  >
                                    <FlameIcon size={20} className="mr-2 shrink-0" strokeWidth={2} /> Run AI Analysis
                                  </Button>
                                )}
                              </motion.div>
                            )}

                            {/* State: Loading */}
                            {roasting && (
                              <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center gap-5 p-6"
                              >
                                <div className="w-28 h-28 rounded-full border border-border flex items-center justify-center bg-background">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                  >
                                    <FlameIcon size={48} className="text-destructive" strokeWidth={2} />
                                  </motion.div>
                                </div>
                                <p className="animate-pulse font-sans text-sm font-medium text-destructive">Forging roast…</p>
                                <div className="w-full space-y-3 mt-2">
                                  <div className="h-3 bg-muted border border-border rounded-lg animate-pulse" />
                                  <div className="h-3 bg-muted border border-border rounded-lg animate-pulse w-4/5" />
                                  <div className="h-3 bg-muted border border-border rounded-lg animate-pulse w-3/5" />
                                </div>
                              </motion.div>
                            )}

                            {/* State: Error */}
                            {roastError && !roasting && (
                              <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center gap-4 p-6"
                              >
                                <AlertTriangle className="w-12 h-12 text-destructive" />
                                <p className="text-sm text-destructive font-bold text-center">{roastError}</p>
                                <Button
                                  onClick={fetchRoast}
                                  variant="outline"
                                  className="border border-border rounded-lg shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs"
                                >
                                  Try Again
                                </Button>
                              </motion.div>
                            )}

                            {/* State: Roast result */}
                            {isCompleteRoastPayload(roastData) && !roasting && (
                              <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ type: "spring", stiffness: 200 }}
                                className="scrollbar-thin max-h-[34rem] space-y-3.5 overflow-y-auto p-4"
                              >
                                <RoastScoreDial score={roastData!.score} bars={roastData!.verdictBars} />

                                <RoastVerdictRadar bars={roastData!.verdictBars} />

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={fetchRoast}
                                  className="w-full border border-border rounded-lg shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs h-10 gap-2 mt-1"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Re-roast
                                  {roastData!.cached ? <span className="font-sans normal-case font-medium text-[10px] opacity-80">(if file changed)</span> : null}
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>

              {/* Roast Thread — always absorbs the leftover height so the column
                  has no gap at the bottom regardless of the AI panel's state. */}
              <motion.div
                layout
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-0 flex-1"
              >
                <Card className="border border-border rounded-lg shadow-[var(--shadow-lg)] flex flex-col overflow-hidden h-full w-full bg-card">
                  <CardHeader
                    role="button"
                    tabIndex={0}
                    onClick={toggleSwap}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSwap(); } }}
                    aria-label={chatOpen ? "Collapse chat" : "Expand chat"}
                    aria-expanded={chatOpen}
                    className={cn(panelHeaderClass, "cursor-pointer select-none", !chatOpen && "border-b-0")}
                  >
                     <div className="flex items-center gap-2.5 min-w-0">
                       <FlameIcon size={20} className="shrink-0 text-yellow-200" strokeWidth={2.5} aria-hidden />
                       <CardTitle className="text-base tracking-tight text-primary-foreground truncate">
                         Roast Thread
                       </CardTitle>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                       <Badge
                         variant="secondary"
                         className="border border-border rounded-lg shadow-[var(--shadow-xs)] font-heading font-bold text-[10px] uppercase bg-background text-foreground px-2.5 py-1"
                       >
                         {comments.length} {comments.length === 1 ? "comment" : "comments"}
                       </Badge>
                       <button
                         type="button"
                         onClick={(e) => { e.stopPropagation(); toggleSwap(); }}
                         aria-label={chatOpen ? "Collapse chat" : "Expand chat"}
                         className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-border bg-background/10 text-primary-foreground hover:bg-background/20 transition-colors"
                       >
                         {chatOpen ? <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />}
                       </button>
                     </div>
                  </CardHeader>
                  {/* Always rendered: the thread is the primary surface here, and
                      keeping it mounted is what guarantees the column stays full. */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    {(
                      <div className="flex min-h-0 flex-1 flex-col">
                        {/* Scrollable comments area */}
                        <div className="bg-muted/30 flex-1 overflow-y-auto p-4 min-h-0 flex flex-col scrollbar-thin">
                          {comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-6 text-center my-auto space-y-6">
                              {/* Visual Preview Container */}
                              <div className="w-full max-w-sm relative space-y-4 px-2 select-none pointer-events-none opacity-85">
                                {/* Mock Card 1 */}
                                <div className="border border-border bg-card p-3.5 shadow-[var(--shadow-2xs)] text-left transform -rotate-1 scale-95 translate-y-2 opacity-75 dark:opacity-90">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 rounded-full border border-border bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center text-[9px] font-mono font-bold">
                                      S
                                    </div>
                                    <span className="font-mono text-[10px] font-bold text-foreground">u/SeniorDesigner</span>
                                    <span className="border border-emerald-500/25 rounded-lg font-bold uppercase py-0 px-1 text-[8px] bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                      strength
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    Outstanding visual hierarchy. The neobrutalist styling gives this application a distinct, premium identity.
                                  </p>
                                </div>

                                {/* Mock Card 2 */}
                                <div className="border border-border bg-card p-3.5 shadow-[var(--shadow-xs)] text-left transform rotate-1 relative z-10">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 rounded-full border border-border bg-orange-400/20 dark:bg-orange-400/30 flex items-center justify-center text-[9px] font-mono font-bold">
                                      R
                                    </div>
                                    <span className="font-mono text-[10px] font-bold text-foreground">u/RecruiterPro</span>
                                    <span className="border border-orange-400/30 rounded-lg font-bold uppercase py-0 px-1 text-[8px] bg-orange-400/20 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300">
                                      weakness
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    Quantifiable achievements are missing in the early internships. Add clear metrics to stand out.
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2 max-w-xs">
                                <h3 className="font-heading text-lg tracking-tight text-foreground">No feedback yet</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {isOwner
                                    ? "Your resume is ready for review! Share the link with friends, colleagues, or reviewers to start the thread."
                                    : "Be the first to roast! Highlight strengths, pinpoint weaknesses, or offer suggestions below."}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3.5 w-full">
                              {comments.map((c) => (
                                <EnhancedComment key={c._id} comment={c} onRefresh={loadComments} />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Post form — pinned at bottom */}
                        <div className="shrink-0 border-t border-border bg-card">
                          {user ? (
                            <form onSubmit={postComment} className="p-3 space-y-2 flex flex-col bg-muted/30">
                              {!isOwner && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {(["strength", "weakness", "suggestion", "comment"] as const).map((t) => {
                                    const isSelected = commentType === t;
                                    const btnColors = {
                                      strength: isSelected
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-border"
                                        : "bg-background/80 text-foreground border-border hover:bg-emerald-500/10",
                                      weakness: isSelected
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-border"
                                        : "bg-background/80 text-foreground border-border hover:bg-orange-400/10",
                                      suggestion: isSelected
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-border"
                                        : "bg-background/80 text-foreground border-border hover:bg-blue-500/10",
                                      comment: isSelected
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-border"
                                        : "bg-background/80 text-foreground border-border hover:bg-amber-500/10",
                                    };
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => setCommentType(t)}
                                        className={cn(
                                          "cursor-pointer uppercase rounded-lg border px-2.5 py-1 text-[10px] font-heading font-bold transition-all shadow-[var(--shadow-2xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5",
                                          btnColors[t]
                                        )}
                                      >
                                        {t}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              <label htmlFor="comment-text" className="sr-only">
                                {isOwner ? "Add a comment" : "Write your roast or feedback"}
                              </label>
                              <textarea
                                id="comment-text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder={isOwner ? "Add a comment..." : "Write your roast / feedback..."}
                                rows={2}
                                aria-label={isOwner ? "Add a comment" : "Write your roast or feedback"}
                                className="w-full min-h-16 p-2.5 border border-border rounded-lg shadow-[var(--shadow-sm)] focus:outline-none focus-visible:border-foreground/40 resize-none text-sm font-medium bg-background leading-relaxed"
                                required
                              />
                              <div className="flex justify-end pt-0.5">
                                <Button
                                  type="submit"
                                  disabled={posting}
                                  className="min-h-10 min-w-20 px-5 border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-sm tracking-wide bg-primary text-primary-foreground "
                                >
                                  {posting ? "…" : "Post"}
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <div className="p-4 text-center">
                              <Link
                                href="/login"
                                className={cn(
                                  buttonVariants({ variant: "outline" }),
                                  "inline-flex border border-border rounded-lg shadow-[var(--shadow-sm)] font-heading text-xs no-underline hover:no-underline",
                                )}
                              >
                                Log in to join the roast
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </Card>
              </motion.div>
            </div>

            {/* Mobile fallback: stacked single-column, no swap */}
            <div className="order-2 flex flex-col gap-6 lg:hidden">
              <div className="flex min-h-[20rem] flex-col">
                <Card className="border border-border rounded-lg shadow-[var(--shadow-lg)] flex flex-col h-full bg-card">
                  <CardHeader className={cn(panelHeaderClass, "justify-start")}>
                    <CardTitle className="text-base flex items-center gap-2.5 tracking-tight text-primary-foreground">
                      <Sparkles className="w-5 h-5 shrink-0" strokeWidth={2.5} /> AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-hidden min-h-0 flex-1 flex flex-col bg-background">
                    <AnimatePresence mode="wait">
                      {!isCompleteRoastPayload(roastData) && !roasting && !roastError && (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col flex-1 min-h-0 justify-between p-4"
                        >
                          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-1 py-3">
                            <div className="w-28 h-28 rounded-full border-[5px] border-dashed border-border flex items-center justify-center bg-muted/40 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                              <Zap className="w-10 h-10 text-foreground/70" strokeWidth={2} />
                            </div>
                            <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed max-w-[18rem]">
                              {isPdf
                                ? "No roast yet. Hit the button to unleash the AI."
                                : "AI roast is only available for PDF resumes."}
                            </p>
                          </div>
                          {isPdf && isOwner && user && (
                            <Button
                              onClick={fetchRoast}
                              className="w-full border border-border shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading tracking-wide bg-background text-foreground hover:bg-muted/80 text-sm py-6 min-h-[3.25rem]"
                            >
                              <FlameIcon size={20} className="mr-2 shrink-0" strokeWidth={2} /> Run AI Analysis
                            </Button>
                          )}
                        </motion.div>
                      )}
                      {roasting && (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center gap-5 p-5 flex-1 min-h-0 overflow-y-auto"
                        >
                          <div className="w-32 h-32 rounded-full border border-border flex items-center justify-center bg-background">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            >
                              <FlameIcon size={48} className="text-destructive" strokeWidth={2} />
                            </motion.div>
                          </div>
                          <p className="animate-pulse font-sans text-sm font-medium text-destructive">Forging roast…</p>
                          <div className="w-full space-y-3 mt-2">
                            <div className="h-3 bg-muted border border-border rounded-lg animate-pulse" />
                            <div className="h-3 bg-muted border border-border rounded-lg animate-pulse w-4/5" />
                            <div className="h-3 bg-muted border border-border rounded-lg animate-pulse w-3/5" />
                          </div>
                        </motion.div>
                      )}
                      {roastError && !roasting && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center gap-4 p-5 flex-1 min-h-0 overflow-y-auto"
                        >
                          <AlertTriangle className="w-12 h-12 text-destructive" />
                          <p className="text-sm text-destructive font-bold text-center">{roastError}</p>
                          <Button
                            onClick={fetchRoast}
                            variant="outline"
                            className="border border-border rounded-lg shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs"
                          >
                            Try Again
                          </Button>
                        </motion.div>
                      )}
                      {isCompleteRoastPayload(roastData) && !roasting && (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="space-y-3.5 p-4 flex-1 min-h-0 overflow-y-auto scrollbar-thin"
                        >
                          <RoastScoreDial score={roastData!.score} bars={roastData!.verdictBars} />
                          <RoastVerdictRadar bars={roastData!.verdictBars} />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={fetchRoast}
                            className="w-full border border-border rounded-lg shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs h-10 gap-2 mt-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Re-roast
                            {roastData!.cached ? <span className="font-sans normal-case font-medium text-[10px] opacity-80">(if file changed)</span> : null}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </div>

              <div className="flex h-[400px] min-h-0 flex-col">
                <Card className="border border-border rounded-lg shadow-[var(--shadow-lg)] flex flex-col overflow-hidden h-full bg-card">
                  <CardHeader className={panelHeaderClass}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FlameIcon size={20} className="shrink-0 text-yellow-200" strokeWidth={2.5} aria-hidden />
                      <CardTitle className="text-base tracking-tight text-primary-foreground truncate">
                        Roast Thread
                      </CardTitle>
                    </div>
                    <Badge
                      variant="secondary"
                      className="border border-border rounded-lg shadow-[var(--shadow-xs)] font-heading font-bold text-[10px] uppercase bg-background text-foreground px-2.5 py-1 shrink-0"
                    >
                      {comments.length} {comments.length === 1 ? "comment" : "comments"}
                    </Badge>
                  </CardHeader>
                  <div className="bg-muted/30 flex-1 overflow-y-auto p-4 min-h-0 flex flex-col scrollbar-thin">
                    {comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center my-auto space-y-6">
                        <h3 className="font-heading text-lg tracking-tight text-foreground">No feedback yet</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isOwner
                            ? "Your resume is ready for review! Share the link with friends, colleagues, or reviewers to start the thread."
                            : "Be the first to roast! Highlight strengths, pinpoint weaknesses, or offer suggestions below."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5 w-full">
                        {comments.map((c) => (
                          <EnhancedComment key={c._id} comment={c} onRefresh={loadComments} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 border-t border-border bg-card">
                    {user ? (
                      <form onSubmit={postComment} className="p-3 space-y-2 flex flex-col bg-muted/30">
                        <label htmlFor="comment-text-mobile" className="sr-only">
                          Add a comment
                        </label>
                        <textarea
                          id="comment-text-mobile"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          rows={2}
                          aria-label="Add a comment"
                          className="w-full min-h-16 p-2.5 border border-border rounded-lg shadow-[var(--shadow-sm)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none text-sm font-medium bg-background leading-relaxed"
                          required
                        />
                        <div className="flex justify-end pt-0.5">
                          <Button
                            type="submit"
                            disabled={posting}
                            className="min-h-10 min-w-20 px-5 border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-sm tracking-wide bg-primary text-primary-foreground"
                          >
                            {posting ? "…" : "Post"}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-4 text-center">
                        <Link
                          href="/login"
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "inline-flex border border-border rounded-lg shadow-[var(--shadow-sm)] font-heading text-xs no-underline hover:no-underline",
                          )}
                        >
                          Log in to join the roast
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </LayoutGroup>
        ) : (
          <>
            {/* Right: Discussion */}
            <div className="order-2 flex flex-col h-[460px] lg:h-[var(--panel-h)]">
              <Card className="border border-border rounded-lg shadow-[var(--shadow-lg)] flex flex-col overflow-hidden h-full bg-card">
                <CardHeader className={panelHeaderClass}>
                   <div className="flex items-center gap-2.5 min-w-0">
                     <FlameIcon size={20} className="shrink-0 text-yellow-200" strokeWidth={2.5} aria-hidden />
                     <CardTitle className="text-base tracking-tight text-primary-foreground truncate">
                       Roast Thread
                     </CardTitle>
                   </div>
                   <Badge
                     variant="secondary"
                     className="border border-border rounded-lg shadow-[var(--shadow-xs)] font-heading font-bold text-[10px] uppercase bg-background text-foreground px-2.5 py-1 shrink-0"
                   >
                     {comments.length} {comments.length === 1 ? "comment" : "comments"}
                   </Badge>
                </CardHeader>

                {/* Scrollable comments area */}
                <div className="bg-muted/30 flex-1 overflow-y-auto p-4 min-h-0 flex flex-col scrollbar-thin">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center my-auto space-y-6">
                      {/* Visual Preview Container */}
                      <div className="w-full max-w-sm relative space-y-4 px-2 select-none pointer-events-none opacity-85">
                        {/* Mock Card 1 */}
                        <div className="border border-border bg-card p-3.5 shadow-[var(--shadow-2xs)] text-left transform -rotate-1 scale-95 translate-y-2 opacity-75 dark:opacity-90">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full border border-border bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center text-[9px] font-mono font-bold">
                              S
                            </div>
                            <span className="font-mono text-[10px] font-bold text-foreground">u/SeniorDesigner</span>
                            <span className="border border-emerald-500/25 rounded-lg font-bold uppercase py-0 px-1 text-[8px] bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              strength
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            Outstanding visual hierarchy. The neobrutalist styling gives this application a distinct, premium identity.
                          </p>
                        </div>

                        {/* Mock Card 2 */}
                        <div className="border border-border bg-card p-3.5 shadow-[var(--shadow-xs)] text-left transform rotate-1 relative z-10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full border border-border bg-orange-400/20 dark:bg-orange-400/30 flex items-center justify-center text-[9px] font-mono font-bold">
                              R
                            </div>
                            <span className="font-mono text-[10px] font-bold text-foreground">u/RecruiterPro</span>
                            <span className="border border-orange-400/30 rounded-lg font-bold uppercase py-0 px-1 text-[8px] bg-orange-400/20 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300">
                              weakness
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            Quantifiable achievements are missing in the early internships. Add clear metrics to stand out.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 max-w-xs">
                        <h3 className="font-heading text-lg tracking-tight text-foreground">No feedback yet</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isOwner
                            ? "Your resume is ready for review! Share the link with friends, colleagues, or reviewers to start the thread."
                            : "Be the first to roast! Highlight strengths, pinpoint weaknesses, or offer suggestions below."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5 w-full">
                      {comments.map((c) => (
                        <EnhancedComment key={c._id} comment={c} onRefresh={loadComments} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Post form — pinned at bottom */}
                <div className="shrink-0 border-t border-border bg-card">
                  {user ? (
                    <form onSubmit={postComment} className="p-3 space-y-2 flex flex-col bg-muted/30">
                      {!isOwner && (
                        <div className="flex gap-1.5 flex-wrap">
                          {(["strength", "weakness", "suggestion", "comment"] as const).map((t) => {
                            const isSelected = commentType === t;
                            const btnColors = {
                              strength: isSelected
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-border"
                                : "bg-background/80 text-foreground border-border hover:bg-emerald-500/10",
                              weakness: isSelected
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-border"
                                : "bg-background/80 text-foreground border-border hover:bg-orange-400/10",
                              suggestion: isSelected
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-border"
                                : "bg-background/80 text-foreground border-border hover:bg-blue-500/10",
                              comment: isSelected
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-border"
                                : "bg-background/80 text-foreground border-border hover:bg-amber-500/10",
                            };
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setCommentType(t)}
                                className={cn(
                                  "cursor-pointer uppercase rounded-lg border px-2.5 py-1 text-[10px] font-heading font-bold transition-all shadow-[var(--shadow-2xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5",
                                  btnColors[t]
                                )}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <label htmlFor="comment-text" className="sr-only">
                        {isOwner ? "Add a comment" : "Write your roast or feedback"}
                      </label>
                      <textarea
                        id="comment-text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={isOwner ? "Add a comment..." : "Write your roast / feedback..."}
                        rows={2}
                        aria-label={isOwner ? "Add a comment" : "Write your roast or feedback"}
                        className="w-full min-h-16 p-2.5 border border-border rounded-lg shadow-[var(--shadow-sm)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none text-sm font-medium bg-background leading-relaxed"
                        required
                      />
                      <div className="flex justify-end pt-0.5">
                        <Button
                          type="submit"
                          disabled={posting}
                          className="min-h-10 min-w-20 px-5 border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-sm tracking-wide bg-primary text-primary-foreground "
                        >
                          {posting ? "…" : "Post"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 text-center">
                      <Link
                        href="/login"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "inline-flex border border-border rounded-lg shadow-[var(--shadow-sm)] font-heading text-xs no-underline hover:no-underline",
                        )}
                      >
                        Log in to join the roast
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
