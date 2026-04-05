"use client";

import { ComicCard } from "@/components/comic-card";
import { EnhancedComment } from "@/components/enhanced-comment";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch, commentApi, resumeApi, type Resume, type Comment } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FaArrowLeft, FaFilePdf } from "react-icons/fa";
import { AiFillFire } from "react-icons/ai";
import { useAuth } from "@/store/auth";

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

  const isOwner = user && resume && user.id === resume.userId._id;

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

  // Make sure owners can't post roast tags if they bypass UI
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <ComicCard variant="teal" shadow="large" className="text-center">
          <p className={cn(display.className, "text-2xl animate-pulse")}>Loading resume...</p>
        </ComicCard>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="py-16 text-center">
        <p className={cn(display.className, "text-2xl mb-4")}>Resume not found.</p>
        <button type="button" onClick={() => router.push("/")} className={cn(display.className, "comic-btn bg-beige comic-shadow-3 comic-lift text-lg")}>
          Back Home
        </button>
      </div>
    );
  }

  const topLevel = comments.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className={cn(display.className, "comic-btn bg-beige comic-shadow-3 comic-lift text-sm")}>
          <FaArrowLeft /> Back
        </button>
        <h1 className={cn(display.className, "text-2xl sm:text-3xl")}>
          {resume.name}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: resume info */}
        <div className="lg:col-span-2 space-y-4">
          <ComicCard variant="peach" shadow="medium">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FaFilePdf className="text-3xl text-[#2c2c2c]" />
                <div>
                  <p className={cn(display.className, "text-base")}>Resume PDF</p>
                  <a href={resume.fileUrl} target="_blank" rel="noreferrer" className={cn(body.className, "text-sm underline text-blue-800")}>
                    Open in full screen
                  </a>
                </div>
              </div>
            </div>
            {/* Embed PDF visible to the user */}
            <div className="w-full aspect-[1/1.4] rounded-xl overflow-hidden comic-border-2 bg-white relative comic-shadow-inner group">
              {resume.fileType === "pdf" ? (
                <iframe src={resume.fileUrl + "#toolbar=0&navpanes=0&scrollbar=0"} className="w-full h-full border-none" />
              ) : (
                <img src={resume.fileUrl} className="w-full h-full object-contain" alt="Resume" />
              )}
            </div>
          </ComicCard>

          {/* AI Suggestions (if present in future) */}
          {resume.blurb && (
            <ComicCard variant="yellow" shadow="small">
              <p className={cn(display.className, "text-base mb-2")}>Author's Note</p>
              <p className={cn(body.className, "text-sm text-[#2c2c2c]")}>
                {resume.blurb}
              </p>
            </ComicCard>
          )}

        </div>

        {/* Right: discussion */}
        <div className="lg:col-span-3 space-y-4">
          <ComicCard variant="gradient" shadow="medium">
            <div className="flex items-center gap-2 mb-3">
              <AiFillFire className="text-xl text-orange-600" />
              <p className={cn(display.className, "text-lg")}>Roast Thread</p>
              <span className={cn(display.className, "ml-auto text-sm bg-white/50 rounded-full comic-border-2 px-2 py-0.5")}>
                {comments.length} comments
              </span>
            </div>

            {/* Post form */}
            <form onSubmit={postComment} className="mb-4 space-y-2">
              <div className="flex gap-2 flex-wrap mb-1">
                {!isOwner && (["strength", "weakness", "suggestion"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setCommentType(t)} className={cn(display.className, "uppercase rounded-full comic-border-2 px-3 py-1 text-xs comic-shadow-2 comic-lift transition-colors", commentType === t ? "bg-green-400" : "bg-white/60 hover:bg-white")}>
                    {t}
                  </button>
                ))}
                <button type="button" onClick={() => setCommentType("comment")} className={cn(display.className, "uppercase rounded-full comic-border-2 px-3 py-1 text-xs comic-shadow-2 comic-lift transition-colors", commentType === "comment" ? "bg-yellow" : "bg-white/60 hover:bg-white")}>
                  {isOwner ? "Add Comment" : "Comment"}
                </button>
              </div>

              {isOwner && (
                <p className={cn(body.className, "text-[10px] text-orange-800 ml-1 mb-1")}>
                  You cannot roast your own resume, but you can reply to comments!
                </p>
              )}

              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isOwner ? "Write a comment..." : "Write your roast / feedback..."}
                rows={3}
                className={cn(body.className, "w-full p-3 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white transition-colors resize-none")}
                required
              />
              <button type="submit" disabled={posting} className={cn(display.className, "comic-btn bg-orange-400 hover:bg-orange-500 comic-shadow-3 comic-lift text-sm px-6")}>
                {posting ? "Posting..." : isOwner ? "Post Comment" : "Post Roast 🔥"}
              </button>
            </form>

            <div className="border-t-2 border-[#2c2c2c] my-4 opacity-10"></div>

            {/* Comments list */}
            {topLevel.length === 0 ? (
              <p className={cn(body.className, "text-sm text-[#2c2c2c]/60 text-center py-4")}>
                No comments yet. Be the first to roast!
              </p>
            ) : (
              topLevel.map((c) => (
                <EnhancedComment key={c._id} comment={c} allComments={comments} onRefresh={loadComments} />
              ))
            )}
          </ComicCard>
        </div>
      </div>
    </div>
  );
}
