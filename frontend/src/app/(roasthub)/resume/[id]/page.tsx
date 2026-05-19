"use client";

import { EnhancedComment } from "@/components/enhanced-comment";
import { ResumeReactionControls } from "@/components/resume-reaction-controls";
import { cn } from "@/lib/utils";
import { resumeApi, commentApi, analysisApi, type Resume, type Comment, type RoastData } from "@/lib/api";
import { enqueueResumeReaction, flushQueuedResumeReactions } from "@/lib/resume-reaction-sync";
import { coalesceVerdictBars, isCompleteRoastPayload, verdictBarFillClass } from "@/lib/verdict-dimensions";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, ArrowLeft, RefreshCw, Zap, MessageSquare, Trash2, Sparkles, AlertTriangle, Briefcase } from "lucide-react";
import FlameIcon from "@/components/icons/flame-icon";
import { useAuth } from "@/store/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

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

  const isOwner = Boolean(
    resume && (resume.isOwner === true || (user && user.id === resume.userId?._id)),
  );

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
        roastText: ar.roastText,
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

  // Score color helper
  function scoreColor(score: number) {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-destructive";
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 py-8">
        <Skeleton className="h-16 w-3/4 border-[3px] border-border rounded-none" />
        <Skeleton className="h-125 w-full border-[3px] border-border rounded-none" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 py-16 text-center">
        <h1 className="text-4xl font-heading mb-6">Resume not found</h1>
        <Button onClick={() => router.push("/")} className="border-[3px] border-border rounded-none shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading text-lg tracking-wide">
          Back Home
        </Button>
      </div>
    );
  }

  const isPdf = resume.fileType === "pdf";

  const panelHeaderClass =
    "min-h-14 shrink-0 px-4 flex items-center justify-between gap-3 border-b-4 border-border bg-primary text-primary-foreground font-heading tracking-wide";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-4">
            <Button variant="outline" onClick={() => router.back()} className="border-[3px] border-border shadow-[var(--shadow-2xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading text-xs h-8 px-3">
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
                  className="border-[3px] border-border shadow-[var(--shadow-2xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading text-xs h-9"
                  data-testid="link-recruiter-portfolio"
                >
                  <Briefcase className="w-3 h-3 mr-1.5" /> Candidate portfolio
                </Button>
              </Link>
            )}
            {isOwner && (
              <Button variant="destructive" onClick={deleteThisResume} className="border-[3px] border-border shadow-[var(--shadow-2xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading text-xs h-9">
                <Trash2 className="w-3 h-3 mr-1.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="w-full min-w-0 border-b-[3px] border-border" aria-hidden />
      </div>
  
      <div
        className={cn(
          "grid grid-cols-1 items-start gap-6 lg:[--panel-h:clamp(740px,calc(100vh-12.5rem),960px)]",
          isOwner ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.95fr)]" : "lg:grid-cols-[minmax(0,1.55fr)_minmax(380px,1.05fr)]",
        )}
      >
        {/* Center: PDF Viewer */}
        <div className="order-1 border-4 border-border bg-muted overflow-hidden flex flex-col h-[540px] lg:h-[var(--panel-h)]">
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
                 "border-2 border-border bg-background text-foreground shadow-[var(--shadow-xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading text-[10px] h-9 px-3.5 font-bold shrink-0"
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
          <div className="order-2 grid gap-6 lg:h-[var(--panel-h)] lg:grid-rows-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
            {/* Left: AI Roast & Details — owner only */}
            <div className="flex min-h-[20rem] flex-col lg:min-h-0">
              <Card className="border-4 border-border rounded-none shadow-[var(--shadow-lg)] flex flex-col h-full bg-card">
                <CardHeader className={cn(panelHeaderClass, "justify-start")}>
                  <CardTitle className="text-base flex items-center gap-2.5 tracking-tight text-primary-foreground">
                    <Sparkles className="w-5 h-5 shrink-0" strokeWidth={2.5} /> AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden min-h-0 flex-1 flex flex-col bg-background">
                  <AnimatePresence mode="wait">
                    {/* State: No roast yet */}
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
                            className="w-full border-4 border-border shadow-[var(--shadow-md)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading tracking-wide bg-background text-foreground hover:bg-muted/80 text-sm py-6 min-h-[3.25rem]"
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
                        className="flex flex-col items-center justify-center gap-5 p-5 flex-1 min-h-0 overflow-y-auto"
                      >
                        <div className="w-32 h-32 rounded-full border-4 border-border flex items-center justify-center bg-background">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          >
                            <FlameIcon size={48} className="text-destructive" strokeWidth={2} />
                          </motion.div>
                        </div>
                        <p className="text-sm font-bold uppercase text-destructive animate-pulse">Forging roast...</p>
                        <div className="w-full space-y-3 mt-2">
                          <div className="h-3 bg-muted border-2 border-border rounded-none animate-pulse" />
                          <div className="h-3 bg-muted border-2 border-border rounded-none animate-pulse w-4/5" />
                          <div className="h-3 bg-muted border-2 border-border rounded-none animate-pulse w-3/5" />
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
                        className="flex flex-col items-center justify-center gap-4 p-5 flex-1 min-h-0 overflow-y-auto"
                      >
                        <AlertTriangle className="w-12 h-12 text-destructive" />
                        <p className="text-sm text-destructive font-bold text-center">{roastError}</p>
                        <Button
                          onClick={fetchRoast}
                          variant="outline"
                          className="border-4 border-border rounded-none shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading text-xs"
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
                        className="space-y-3.5 p-4 flex-1 min-h-0 overflow-y-auto scrollbar-thin"
                      >
                        <div className="flex flex-col items-center gap-1 pb-2 border-b-4 border-border">
                          <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                            className="w-20 h-20 rounded-full border-4 border-border shadow-[var(--shadow-sm)] flex flex-col items-center justify-center bg-background gap-0"
                          >
                            <span className={cn("text-3xl font-heading leading-none", scoreColor(roastData!.score))}>
                              {roastData!.score}
                            </span>
                          </motion.div>
                          <p className="text-center text-[11px] text-muted-foreground font-bold uppercase tracking-wide px-2">
                            {roastData!.score >= 70 ? "Not terrible." : roastData!.score >= 40 ? "Mediocre at best." : "Brutal."}
                          </p>
                        </div>

                        {/* Verdict Bars Grid */}
                        <div className="border-4 border-border bg-muted/30 p-3 overscroll-contain">
                          <h4 className="font-heading text-xs mb-2.5 tracking-wide flex items-center gap-2">
                            Verdict <span className="text-[10px] font-sans font-normal text-muted-foreground normal-case">(1–5 each)</span>
                          </h4>
                          <div className="space-y-2.5">
                            {coalesceVerdictBars(roastData!.verdictBars).map((bar) => (
                              <div key={bar.id} className="space-y-1">
                                <div className="flex justify-between items-baseline gap-2 text-[11px] font-bold uppercase tracking-tight">
                                  <span className="text-foreground leading-tight min-w-0">{bar.label}</span>
                                  <span className="shrink-0 tabular-nums text-muted-foreground">{bar.score}/5</span>
                                </div>
                                <div className="flex gap-0.5 w-full" role="img" aria-label={`${bar.label}: ${bar.score} out of 5`}>
                                  {[1, 2, 3, 4, 5].map((step) => (
                                    <div
                                      key={step}
                                      className={cn(
                                        "flex-1 h-2.5 min-w-0 border-2 border-border shadow-[1px_1px_0px_0px_hsl(var(--border))]",
                                        step <= bar.score ? verdictBarFillClass(bar.score) : "bg-background",
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={fetchRoast}
                          className="w-full border-4 border-border rounded-none shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading text-xs h-10 gap-2 mt-1"
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

            {/* Right: Discussion */}
            <div className="flex h-[400px] min-h-0 flex-col lg:h-auto lg:min-h-0">
              <Card className="border-4 border-border rounded-none shadow-[var(--shadow-lg)] flex flex-col overflow-hidden h-full bg-card">
                <CardHeader className={panelHeaderClass}>
                   <div className="flex items-center gap-2.5 min-w-0">
                     <FlameIcon size={20} className="shrink-0 text-yellow-200" strokeWidth={2.5} aria-hidden />
                     <CardTitle className="text-base tracking-tight text-primary-foreground truncate">
                       Roast Thread
                     </CardTitle>
                   </div>
                   <Badge
                     variant="secondary"
                     className="border-2 border-border rounded-none shadow-[var(--shadow-xs)] font-heading font-bold text-[10px] uppercase bg-background text-foreground px-2.5 py-1 shrink-0"
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
                        <div className="border-[3px] border-border bg-card p-3.5 shadow-[var(--shadow-2xs)] text-left transform -rotate-1 scale-95 translate-y-2 opacity-75 dark:opacity-90">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full border-2 border-border bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center text-[9px] font-mono font-bold">
                              S
                            </div>
                            <span className="font-mono text-[10px] font-bold text-foreground">u/SeniorDesigner</span>
                            <span className="border border-emerald-500/25 rounded-none font-bold uppercase py-0 px-1 text-[8px] bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              strength
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            Outstanding visual hierarchy. The neobrutalist styling gives this application a distinct, premium identity.
                          </p>
                        </div>

                        {/* Mock Card 2 */}
                        <div className="border-[3px] border-border bg-card p-3.5 shadow-[var(--shadow-xs)] text-left transform rotate-1 relative z-10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full border-2 border-border bg-orange-400/20 dark:bg-orange-400/30 flex items-center justify-center text-[9px] font-mono font-bold">
                              R
                            </div>
                            <span className="font-mono text-[10px] font-bold text-foreground">u/RecruiterPro</span>
                            <span className="border border-orange-400/30 rounded-none font-bold uppercase py-0 px-1 text-[8px] bg-orange-400/20 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300">
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
                <div className="shrink-0 border-t-4 border-border bg-card">
                  {user ? (
                    <form onSubmit={postComment} className="p-3 space-y-2 flex flex-col bg-muted/30">
                      {!isOwner && (
                        <div className="flex gap-1.5 flex-wrap">
                          {(["strength", "weakness", "suggestion", "comment"] as const).map((t) => {
                            const isSelected = commentType === t;
                            const btnColors = {
                              strength: isSelected
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-emerald-500/10",
                              weakness: isSelected
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-orange-400/10",
                              suggestion: isSelected
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-blue-500/10",
                              comment: isSelected
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-amber-500/10",
                            };
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setCommentType(t)}
                                className={cn(
                                  "cursor-pointer uppercase rounded-none border-2 px-2.5 py-1 text-[10px] font-heading font-bold transition-all shadow-[var(--shadow-2xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5",
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
                        className="w-full min-h-16 p-2.5 border-4 border-border rounded-none shadow-[var(--shadow-sm)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none text-sm font-medium bg-background leading-relaxed"
                        required
                      />
                      <div className="flex justify-end pt-0.5">
                        <Button
                          type="submit"
                          disabled={posting}
                          className="min-h-10 min-w-20 px-5 border-4 border-border shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading text-sm tracking-wide bg-primary text-primary-foreground "
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
                           "inline-flex border-4 border-border rounded-none shadow-[var(--shadow-sm)] font-heading text-xs no-underline hover:no-underline",
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
        ) : (
          <>
            {/* Right: Discussion */}
            <div className="order-2 flex flex-col h-[460px] lg:h-[var(--panel-h)]">
              <Card className="border-4 border-border rounded-none shadow-[var(--shadow-lg)] flex flex-col overflow-hidden h-full bg-card">
                <CardHeader className={panelHeaderClass}>
                   <div className="flex items-center gap-2.5 min-w-0">
                     <FlameIcon size={20} className="shrink-0 text-yellow-200" strokeWidth={2.5} aria-hidden />
                     <CardTitle className="text-base tracking-tight text-primary-foreground truncate">
                       Roast Thread
                     </CardTitle>
                   </div>
                   <Badge
                     variant="secondary"
                     className="border-2 border-border rounded-none shadow-[var(--shadow-xs)] font-heading font-bold text-[10px] uppercase bg-background text-foreground px-2.5 py-1 shrink-0"
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
                        <div className="border-[3px] border-border bg-card p-3.5 shadow-[var(--shadow-2xs)] text-left transform -rotate-1 scale-95 translate-y-2 opacity-75 dark:opacity-90">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full border-2 border-border bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center text-[9px] font-mono font-bold">
                              S
                            </div>
                            <span className="font-mono text-[10px] font-bold text-foreground">u/SeniorDesigner</span>
                            <span className="border border-emerald-500/25 rounded-none font-bold uppercase py-0 px-1 text-[8px] bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              strength
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            Outstanding visual hierarchy. The neobrutalist styling gives this application a distinct, premium identity.
                          </p>
                        </div>

                        {/* Mock Card 2 */}
                        <div className="border-[3px] border-border bg-card p-3.5 shadow-[var(--shadow-xs)] text-left transform rotate-1 relative z-10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full border-2 border-border bg-orange-400/20 dark:bg-orange-400/30 flex items-center justify-center text-[9px] font-mono font-bold">
                              R
                            </div>
                            <span className="font-mono text-[10px] font-bold text-foreground">u/RecruiterPro</span>
                            <span className="border border-orange-400/30 rounded-none font-bold uppercase py-0 px-1 text-[8px] bg-orange-400/20 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300">
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
                <div className="shrink-0 border-t-4 border-border bg-card">
                  {user ? (
                    <form onSubmit={postComment} className="p-3 space-y-2 flex flex-col bg-muted/30">
                      {!isOwner && (
                        <div className="flex gap-1.5 flex-wrap">
                          {(["strength", "weakness", "suggestion", "comment"] as const).map((t) => {
                            const isSelected = commentType === t;
                            const btnColors = {
                              strength: isSelected
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-emerald-500/10",
                              weakness: isSelected
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-orange-400/10",
                              suggestion: isSelected
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-blue-500/10",
                              comment: isSelected
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-border"
                                : "bg-background/80 text-foreground border-border/40 hover:bg-amber-500/10",
                            };
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setCommentType(t)}
                                className={cn(
                                  "cursor-pointer uppercase rounded-none border-2 px-2.5 py-1 text-[10px] font-heading font-bold transition-all shadow-[var(--shadow-2xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5",
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
                        className="w-full min-h-16 p-2.5 border-4 border-border rounded-none shadow-[var(--shadow-sm)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none text-sm font-medium bg-background leading-relaxed"
                        required
                      />
                      <div className="flex justify-end pt-0.5">
                        <Button
                          type="submit"
                          disabled={posting}
                          className="min-h-10 min-w-20 px-5 border-4 border-border shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading text-sm tracking-wide bg-primary text-primary-foreground "
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
                          "inline-flex border-4 border-border rounded-none shadow-[var(--shadow-sm)] font-heading text-xs no-underline hover:no-underline",
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

      {resume.blurb && (
        <Card className="border-4 border-border rounded-none shadow-[var(--shadow-md)] bg-yellow/10">
          <CardHeader className="py-4 border-b-4 border-border bg-yellow/20">
            <CardTitle className="font-heading text-base tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" /> Author&apos;s Note
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm font-medium leading-relaxed">{resume.blurb}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

