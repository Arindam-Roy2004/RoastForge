"use client";

import { EnhancedComment } from "@/components/enhanced-comment";
import { cn } from "@/lib/utils";
import { resumeApi, commentApi, analysisApi, type Resume, type Comment, type RoastData } from "@/lib/api";
import { coalesceVerdictBars, isCompleteRoastPayload, verdictBarFillClass } from "@/lib/verdict-dimensions";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Flame, FileText, ArrowLeft, RefreshCw, Zap, MessageSquare, Trash2, Sparkles, AlertTriangle, Briefcase } from "lucide-react";
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

  // AI Roast state
  const [roastData, setRoastData] = useState<RoastData | null>(null);
  const [roasting, setRoasting] = useState(false);
  const [roastError, setRoastError] = useState("");

  const isOwner = Boolean(
    resume && (resume.isOwner === true || (user && user.id === resume.userId?._id)),
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
      <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 py-8">
        <Skeleton className="h-16 w-3/4 border-[3px] border-border rounded-none" />
        <Skeleton className="h-125 w-full border-[3px] border-border rounded-none" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto w-full max-w-[1600px] p-4 py-16 text-center">
        <h1 className="text-4xl font-heading uppercase mb-6">Resume not found</h1>
        <Button onClick={() => router.push("/")} className="border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading uppercase text-lg tracking-wide">
          Back Home
        </Button>
      </div>
    );
  }

  const isPdf = resume.fileType === "pdf";

  const panelHeaderClass =
    "min-h-14 shrink-0 px-4 flex items-center justify-between gap-3 border-b-4 border-border bg-primary text-primary-foreground font-heading uppercase tracking-wide";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-4">
            <Button variant="outline" onClick={() => router.back()} className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-8 px-3">
              <ArrowLeft className="w-3 h-3 mr-1.5" /> Back
            </Button>

            <div>
              <h1 className="text-3xl md:text-5xl font-heading uppercase tracking-tighter font-black mb-1">
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
            {user?.role === "recruiter" && resume.userId?._id && (
              <Link href={`/recruiter/candidate/${resume.userId._id}`}>
                <Button
                  variant="secondary"
                  className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-9"
                  data-testid="link-recruiter-portfolio"
                >
                  <Briefcase className="w-3 h-3 mr-1.5" /> Candidate portfolio
                </Button>
              </Link>
            )}
            {isOwner && (
              <Button variant="destructive" onClick={deleteThisResume} className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-9">
                <Trash2 className="w-3 h-3 mr-1.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="w-full min-w-0 border-b-[3px] border-border" aria-hidden />
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-6 lg:[--panel-h:clamp(520px,calc(100dvh-14rem),920px)]",
          isOwner ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2.3fr)_minmax(0,1.2fr)]" : "lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)]",
        )}
      >
        {/* Left: AI Roast & Details — owner only */}
        {isOwner && (
        <div className="flex flex-col h-[500px] lg:h-[var(--panel-h)]">
          <Card className="border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden h-full bg-card">
            <CardHeader className={cn(panelHeaderClass, "justify-start")}>
              <CardTitle className="text-base flex items-center gap-2.5 font-black tracking-tight text-primary-foreground">
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
                    className="flex flex-col flex-1 min-h-0 justify-between p-5"
                  >
                    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-1 py-4">
                      <div className="w-36 h-36 rounded-full border-[5px] border-dashed border-border flex items-center justify-center bg-muted/40 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                        <Zap className="w-14 h-14 text-foreground/70" strokeWidth={2} />
                      </div>
                      <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed max-w-[14rem]">
                        {isPdf
                          ? "No roast yet. Hit the button to unleash the AI."
                          : "AI roast is only available for PDF resumes."}
                      </p>
                    </div>
                    {isPdf && isOwner && user && (
                      <Button
                        onClick={fetchRoast}
                        className="w-full border-4 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase tracking-wide bg-background text-foreground hover:bg-muted/80 text-sm font-black py-7 min-h-[3.25rem]"
                      >
                        <Flame className="w-5 h-5 mr-2 shrink-0" /> Run AI Analysis
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
                        <Flame className="w-12 h-12 text-destructive" />
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
                      className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading uppercase text-xs"
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
                    className="space-y-3 p-5 flex-1 min-h-0 overflow-y-auto"
                  >
                    <div className="flex flex-col items-center gap-1.5 pb-1 border-b-4 border-border">
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="w-28 h-28 rounded-full border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center bg-background gap-0"
                      >
                        <span className={cn("text-4xl font-heading leading-none", scoreColor(roastData!.score))}>
                          {roastData!.score}
                        </span>
                      </motion.div>
                      <p className="text-center text-[11px] text-muted-foreground font-bold uppercase tracking-wide px-2">
                        {roastData!.score >= 70 ? "Not terrible." : roastData!.score >= 40 ? "Mediocre at best." : "Brutal."}
                      </p>
                    </div>

                    <div className="border-4 border-border bg-muted/30 p-3 overscroll-contain">
                      <h4 className="font-heading uppercase text-xs mb-2.5 tracking-wide flex items-center gap-2">
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
                                    "flex-1 h-2.5 min-w-0 border-2 border-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
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
                      className="w-full border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading uppercase text-xs h-10 gap-2 mt-1"
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
        )}

        {/* Center: PDF Viewer */}
        <div className="border-4 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-muted overflow-hidden flex flex-col h-[500px] lg:h-[var(--panel-h)]">
          <div className={cn(panelHeaderClass, "text-sm font-black")}>
             <div className="flex items-center gap-2.5 min-w-0">
               <FileText className="w-5 h-5 shrink-0" strokeWidth={2.5} /> <span className="truncate">Resume PDF</span>
             </div>
             <a 
               href={resume.fileUrl} 
               target="_blank" 
               rel="noreferrer" 
               className={cn(
                 buttonVariants({ variant: "secondary", size: "sm" }),
                 "border-2 border-border bg-background text-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-[10px] h-9 px-3.5 font-bold shrink-0"
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

        {/* Right: Discussion */}
        <div className="flex flex-col h-[500px] lg:h-[var(--panel-h)]">
          <Card className="border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden h-full bg-card">
            <CardHeader className={panelHeaderClass}>
               <div className="flex items-center gap-2.5 min-w-0">
                 <Flame className="w-5 h-5 shrink-0 text-yellow-200" strokeWidth={2.5} aria-hidden />
                 <CardTitle className="text-base font-black tracking-tight text-primary-foreground truncate">
                   Roast Thread
                 </CardTitle>
               </div>
               <Badge
                 variant="secondary"
                 className="border-2 border-border rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-heading font-bold text-[10px] uppercase bg-background text-foreground px-2.5 py-1 shrink-0"
               >
                 {comments.length} {comments.length === 1 ? "comment" : "comments"}
               </Badge>
            </CardHeader>

            {/* Scrollable comments area */}
            <div className="bg-background flex-1 overflow-y-auto p-4 min-h-0 flex flex-col">
              {comments.length === 0 ? (
                <div className="flex flex-1 min-h-[12rem] flex-col items-center justify-center">
                  <div className="w-full max-w-sm border-[5px] border-dashed border-border bg-muted/25 px-6 py-10 text-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
                    <MessageSquare className="w-10 h-10 mx-auto mb-4 text-muted-foreground/80" strokeWidth={1.75} />
                    <p className="font-heading uppercase text-sm font-black tracking-tight text-foreground">No feedback yet.</p>
                    <p className="text-sm mt-2 text-muted-foreground leading-relaxed">Be the first to roast!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 w-full">
                  {comments.map((c) => (
                    <EnhancedComment key={c._id} comment={c} onRefresh={loadComments} />
                  ))}
                </div>
              )}
            </div>

            {/* Post form — pinned at bottom */}
            <div className="shrink-0 border-t-4 border-border bg-card">
              {user ? (
                <form onSubmit={postComment} className="p-4 space-y-3 flex flex-col bg-muted/30">
                  {!isOwner && (
                    <div className="flex gap-1.5 flex-wrap">
                      {(["strength", "weakness", "suggestion", "comment"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCommentType(t)}
                          className={cn(
                            "cursor-pointer uppercase rounded-none border-2 border-border px-2.5 py-1 text-[10px] font-heading font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5",
                            commentType === t
                              ? t === "comment"
                                ? "bg-yellow text-black"
                                : "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={isOwner ? "Add a comment..." : "Write your roast / feedback..."}
                    rows={3}
                    className="w-full min-h-[5.5rem] p-3 border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none text-sm font-medium bg-background leading-relaxed"
                    required
                  />
                  <div className="flex justify-end pt-0.5">
                    <Button
                      type="submit"
                      disabled={posting}
                      className="min-h-11 min-w-[5.5rem] px-6 border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase text-sm tracking-wide bg-primary text-primary-foreground font-black"
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
                      "inline-flex border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-heading uppercase text-xs no-underline hover:no-underline",
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

      {resume.blurb && (
        <Card className="border-4 border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-yellow/10">
          <CardHeader className="py-4 border-b-4 border-border bg-yellow/20">
            <CardTitle className="font-heading uppercase text-base tracking-wide flex items-center gap-2">
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
