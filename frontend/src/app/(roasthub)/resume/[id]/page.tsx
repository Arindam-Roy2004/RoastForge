"use client";

import { EnhancedComment } from "@/components/enhanced-comment";
import { cn } from "@/lib/utils";
import { resumeApi, commentApi, type Resume, type Comment } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2, FileText, Flame, AlertCircle, CheckCircle2, XCircle, TrendingUp, Sparkles, MessageSquare } from "lucide-react";
import { useAuth } from "@/store/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

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

  const isOwner = user && resume && user.id === resume.userId?._id;

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
    if (isOwner && commentType !== "comment") {
      setCommentType("comment");
    }
  }, [isOwner, commentType]);

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
  // Optional mockup logic for AI elements since backend doesn't provide them all yet.
  const aiScore = { overall: 42, atsCompatibility: 45, formatting: 60, impact: 35, readability: 50, keywordDensity: 20 };

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: resume info & score */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-4 border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card">
            <CardHeader className="bg-muted border-b-2 border-border pb-4">
              <CardTitle className="font-heading uppercase text-xl text-center">AI Roast Score</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-center mb-8">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="w-32 h-32 rounded-full border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center bg-background">
                  <span className="text-5xl font-heading text-destructive">{aiScore.overall}</span>
                </motion.div>
              </div>
              <div className="space-y-4">
                {[
                  { label: "ATS Compat.", value: aiScore.atsCompatibility },
                  { label: "Formatting", value: aiScore.formatting },
                  { label: "Impact", value: aiScore.impact },
                  { label: "Readability", value: aiScore.readability },
                  { label: "Keywords", value: aiScore.keywordDensity },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between mb-1 text-xs font-bold uppercase">
                      <span>{stat.label}</span>
                      <span>{stat.value}/100</span>
                    </div>
                    {/* fallback progress-bar if shadcn progress fails */}
                    <div className="w-full bg-muted border-2 border-border h-3 overflow-hidden">
                       <div className="bg-primary h-full border-r-2 border-border" style={{ width: `${stat.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {resume.blurb && (
            <Card className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow/20">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading uppercase text-lg">Author's Note</CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm font-medium">{resume.blurb}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center: PDF Viewer */}
        <div className="xl:col-span-1 border-4 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-muted overflow-hidden flex flex-col h-[700px] xl:h-[auto]">
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
          <Card className="flex-1 border-4 border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden max-h-[800px] xl:max-h-none">
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
    </div>
  );
}
