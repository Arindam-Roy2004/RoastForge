"use client";

import { EnhancedComment } from "@/components/enhanced-comment";
import { cn } from "@/lib/utils";
import { resumeApi, commentApi, analysisApi, type Resume, type Comment, type RoastData } from "@/lib/api";
import { coalesceVerdictBars, isCompleteRoastPayload, verdictBarFillClass } from "@/lib/verdict-dimensions";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2, FileText, Flame, MessageSquare, Zap, AlertTriangle, RefreshCw } from "lucide-react";
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
          toast.success("Fresh roast generated! 🔥");
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
      <div className="container mx-auto p-4 py-8 space-y-4">
        <Skeleton className="h-16 w-3/4 border-4 border-border rounded-none" />
        <Skeleton className="h-[500px] w-full border-4 border-border rounded-none" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="container mx-auto p-4 py-16 text-center">
        <h1 className="text-4xl font-heading uppercase mb-6">Resume not found</h1>
        <Button onClick={() => router.push("/")} className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading uppercase text-lg">
          Back Home
        </Button>
      </div>
    );
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const isPdf = resume.fileType === "pdf";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-4">
          <Button variant="outline" onClick={() => router.back()} className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-8">
            <ArrowLeft className="w-3 h-3 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-4xl sm:text-5xl font-heading uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              {resume.userId?.anonymousUsername ? `${resume.userId.anonymousUsername}'s Resume` : "Anonymous Resume"}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-2">
              Uploaded by <span className="font-bold text-foreground">{resume.userId?.anonymousUsername || resume.userId?.name || "Unknown"}</span>
              {" • "} {new Date(resume.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
           <Badge className="text-base px-4 py-1.5 border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase font-heading bg-green-400 text-black">
             Ready for Roasting
           </Badge>
           {isOwner && (
             <Button variant="destructive" onClick={deleteThisResume} className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-8">
               <Trash2 className="w-3 h-3 mr-2" /> Delete
             </Button>
           )}
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-8 xl:items-stretch",
          isOwner ? "xl:grid-cols-3" : "xl:grid-cols-2",
        )}
      >
        {/* Left: AI Roast (owner only) */}
        {isOwner && (
        <div className="xl:col-span-1 space-y-6 min-h-0">
          <Card className="border-4 border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card flex flex-col max-h-[760px] min-h-0">
            <CardHeader className="bg-muted border-b-2 border-border pb-4">
              <CardTitle className="font-heading uppercase text-xl text-center flex items-center justify-center gap-2">
                <Flame className="w-5 h-5 text-destructive" /> AI Roast Score
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 min-h-0 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* State: No roast yet */}
                {!isCompleteRoastPayload(roastData) && !roasting && !roastError && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-5 py-6"
                  >
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-border flex items-center justify-center bg-muted/30">
                      <Zap className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center font-medium">
                      {isPdf
                        ? "No roast yet. Hit the button to unleash the AI."
                        : "AI roast is only available for PDF resumes."}
                    </p>
                    {isPdf && isOwner && user && (
                      <Button
                        onClick={fetchRoast}
                        className="w-full border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase text-base bg-destructive text-destructive-foreground"
                      >
                        🔥 Roast Me
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
                    className="flex flex-col items-center gap-5 py-6"
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
                    className="flex flex-col items-center gap-4 py-6"
                  >
                    <AlertTriangle className="w-12 h-12 text-destructive" />
                    <p className="text-sm text-destructive font-bold text-center">{roastError}</p>
                    <Button
                      onClick={fetchRoast}
                      variant="outline"
                      className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-heading uppercase text-xs"
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
                    className="space-y-4"
                  >
                    {/* Score circle */}
                    <div className="flex justify-center shrink-0">
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="w-32 h-32 rounded-full border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center bg-background"
                      >
                        <span className={cn("text-5xl font-heading", scoreColor(roastData!.score))}>
                          {roastData!.score}
                        </span>
                      </motion.div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground font-bold uppercase">
                      {roastData!.score >= 70 ? "Not terrible." : roastData!.score >= 40 ? "Mediocre at best." : "Brutal."}
                    </p>

                    {/* Verdict bars — 5 dimensions × /5, fixed layout */}
                    <div className="border-2 border-border bg-muted/30 p-3 shrink-0 max-h-[14rem] overflow-y-auto overscroll-contain">
                      <h4 className="font-heading uppercase text-xs mb-3 tracking-wide flex items-center gap-2">
                        Verdict <span className="text-[10px] font-sans font-normal text-muted-foreground normal-case">(1–5 each)</span>
                      </h4>
                      <div className="space-y-3">
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

                    {/* Refresh button */}
                    <button
                      onClick={fetchRoast}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-bold uppercase mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Re-roast {roastData!.cached && "(cached — updates if resume changed)"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Center: PDF Viewer */}
        <div className="xl:col-span-1 border-4 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-muted overflow-hidden flex flex-col h-[min(70vh,640px)] xl:h-auto xl:min-h-[560px] xl:max-h-[720px]">
          <div className="bg-primary text-primary-foreground p-3 border-b-4 border-border font-heading uppercase flex items-center gap-2 shrink-0">
             <FileText className="w-5 h-5" /> Resume PDF
             <a href={resume.fileUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs underline font-sans capitalize font-medium">Open external</a>
          </div>
          <div className="flex-1 bg-white relative">
            {resume.fileType === "pdf" ? (
              <iframe src={resume.fileUrl} className="absolute inset-0 w-full h-full border-none" title="Resume PDF" />
            ) : (
              <img src={resume.fileUrl} className="w-full h-full object-contain" alt="Resume" />
            )}
          </div>
        </div>

        {/* Right: Discussion */}
        <div className="xl:col-span-1 space-y-6 flex flex-col h-full">
          <Card className="flex-1 border-4 border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden h-[min(70vh,780px)] xl:h-auto xl:min-h-[560px] xl:max-h-[720px]">
            <CardHeader className="bg-muted border-b-4 border-border shrink-0 py-4">
               <div className="flex items-center justify-between">
                 <CardTitle className="font-heading uppercase text-xl flex items-center gap-2">
                   <Flame className="w-5 h-5 text-destructive" /> Roast Thread
                 </CardTitle>
                 <Badge variant="outline" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">{comments.length} comments</Badge>
               </div>
            </CardHeader>
            
            <div className="bg-background flex-1 overflow-y-auto p-4 space-y-4">
              {/* Post form */}
              {user ? (
                <form onSubmit={postComment} className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
                  <div className="flex gap-2 flex-wrap mb-3">
                    {!isOwner && (["strength", "weakness", "suggestion"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setCommentType(t)} className={cn("uppercase rounded-none border-2 border-border px-3 py-1 text-xs font-bold transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none", commentType === t ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {t}
                      </button>
                    ))}
                    <button type="button" onClick={() => setCommentType("comment")} className={cn("uppercase rounded-none border-2 border-border px-3 py-1 text-xs font-bold transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none", commentType === "comment" ? "bg-yellow text-black" : "bg-muted")}>
                      {isOwner ? "Add Comment" : "Comment"}
                    </button>
                  </div>
  
                  {isOwner && (
                    <p className="text-[10px] text-destructive font-bold uppercase tracking-wider mb-2">
                      You cannot roast your own resume, but you can reply to comments!
                    </p>
                  )}
  
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={isOwner ? "Write a comment..." : "Write your roast / feedback..."}
                    rows={3}
                    className="w-full p-3 border-2 border-border rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none text-sm mb-3"
                    required
                  />
                  <Button type="submit" disabled={posting} className="w-full border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase text-sm">
                    {posting ? "Posting..." : isOwner ? "Post Comment" : "Post Roast 🔥"}
                  </Button>
                </form>
              ) : (
                <div className="bg-muted p-6 text-center border-4 border-border border-dashed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
                  <p className="font-heading uppercase mb-3">Log in to join the roast.</p>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "inline-flex border-4 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-heading uppercase no-underline hover:no-underline",
                    )}
                  >
                    Login
                  </Link>
                </div>
              )}
  
              {/* Comments list */}
              {topLevel.length === 0 ? (
                <div className="text-center py-12 border-4 border-border border-dashed text-muted-foreground bg-muted/30">
                   <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
                   <p className="font-heading uppercase">No feedback yet.</p>
                   <p className="text-sm mt-1">Be the first to roast!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topLevel.map((c) => (
                    <EnhancedComment key={c._id} comment={c} allComments={comments} onRefresh={loadComments} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {resume.blurb ? (
        <Card className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-500/15">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading uppercase text-lg">Author&apos;s Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{resume.blurb}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
