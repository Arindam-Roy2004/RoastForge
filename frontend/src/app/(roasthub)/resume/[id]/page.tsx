"use client";

import { ComicCard } from "@/components/comic-card";
import { EnhancedComment } from "@/components/enhanced-comment";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FaArrowLeft, FaFilePdf } from "react-icons/fa";
import { AiFillFire, AiOutlineLike } from "react-icons/ai";

type Resume = {
  _id: string;
  version: number;
  status: string;
  originalPdfUrl?: string;
  aiScore?: { overall: number; atsVisibility: number; readability: number; impact: number };
  aiSuggestions?: { section: string; suggestion: string; type: string }[];
  scoreHistory?: { overall: number; recordedAt: string }[];
  candidateAlias?: string;
  createdAt?: string;
};

type Review = {
  _id: string;
  content: string;
  type: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  reviewerId?: { anonymousPublicId?: string } | string;
  parentReviewId?: string | null;
};

export default function ResumeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<string>("comment");
  const [posting, setPosting] = useState(false);

  const loadResume = useCallback(async () => {
    try {
      const res = await apiFetch<Resume>(`/api/resume/${id}`);
      setResume(res.data || null);
    } catch {
      setResume(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    try {
      const res = await apiFetch<Review[]>(`/api/review/target/${id}`);
      setReviews(res.data || []);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { loadResume(); loadReviews(); }, [loadResume, loadReviews]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await apiFetch("/api/review", {
        method: "POST",
        body: JSON.stringify({ targetId: id, targetModel: "Resume", content: commentText.trim(), type: commentType }),
      });
      setCommentText("");
      loadReviews();
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

  const topLevel = reviews.filter((r) => !r.parentReviewId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className={cn(display.className, "comic-btn bg-beige comic-shadow-3 comic-lift text-sm")}>
          <FaArrowLeft /> Back
        </button>
        <h1 className={cn(display.className, "text-2xl sm:text-3xl")}>
          {resume.candidateAlias || `Resume v${resume.version}`}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: resume info */}
        <div className="lg:col-span-2 space-y-4">
          {/* PDF link */}
          {resume.originalPdfUrl && (
            <ComicCard variant="peach" shadow="medium">
              <div className="flex items-center gap-3">
                <FaFilePdf className="text-3xl text-[#2c2c2c]" />
                <div>
                  <p className={cn(display.className, "text-base")}>Resume PDF</p>
                  <a href={resume.originalPdfUrl} target="_blank" rel="noreferrer" className={cn(body.className, "text-sm underline text-blue-800")}>
                    Open in new tab
                  </a>
                </div>
              </div>
            </ComicCard>
          )}

          {/* Scores */}
          <ComicCard variant="teal" shadow="medium">
            <p className={cn(display.className, "text-lg mb-3")}>AI Scores</p>
            <div className="grid grid-cols-2 gap-2">
              {(["overall", "atsVisibility", "readability", "impact"] as const).map((k) => (
                <div key={k} className="rounded-xl comic-border-2 bg-white/50 p-2 text-center">
                  <p className={cn(display.className, "text-xs uppercase")}>{k}</p>
                  <p className={cn(display.className, "text-2xl")}>{resume.aiScore?.[k] ?? "—"}</p>
                </div>
              ))}
            </div>
          </ComicCard>

          {/* AI Suggestions */}
          {resume.aiSuggestions && resume.aiSuggestions.length > 0 && (
            <ComicCard variant="yellow" shadow="small">
              <p className={cn(display.className, "text-base mb-2")}>AI Suggestions</p>
              {resume.aiSuggestions.map((s, i) => (
                <div key={i} className="rounded-lg comic-border-2 bg-white/40 p-2 mb-2 last:mb-0">
                  <span className={cn(display.className, "text-xs px-2 py-0.5 rounded-full comic-border-2", s.type === "strength" ? "bg-green-300" : s.type === "weakness" ? "bg-red-300" : "bg-blue-300")}>
                    {s.type}
                  </span>
                  <p className={cn(body.className, "text-sm mt-1")}>[{s.section}] {s.suggestion}</p>
                </div>
              ))}
            </ComicCard>
          )}

          {/* Score history */}
          {resume.scoreHistory && resume.scoreHistory.length > 1 && (
            <ComicCard variant="light" shadow="small">
              <p className={cn(display.className, "text-base mb-2")}>Score History</p>
              {resume.scoreHistory.map((h, i) => (
                <p key={i} className={cn(body.className, "text-xs text-[#2c2c2c]/70")}>
                  {new Date(h.recordedAt).toLocaleDateString()}: <strong>{h.overall}</strong>
                </p>
              ))}
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
                {reviews.length} comments
              </span>
            </div>

            {/* Post form */}
            <form onSubmit={postComment} className="mb-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                {(["comment", "strength", "weakness", "suggestion"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setCommentType(t)} className={cn(display.className, "rounded-full comic-border-2 px-3 py-1 text-xs comic-shadow-2 comic-lift", commentType === t ? "bg-green-400" : "bg-white/60")}>
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write your roast / feedback..."
                rows={3}
                className={cn(body.className, "w-full p-3 comic-border rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white transition-colors resize-none")}
                required
              />
              <button type="submit" disabled={posting} className={cn(display.className, "comic-btn bg-orange-400 hover:bg-orange-500 comic-shadow-3 comic-lift text-sm")}>
                {posting ? "Posting..." : "Post Roast 🔥"}
              </button>
            </form>

            {/* Comments list */}
            {topLevel.length === 0 ? (
              <p className={cn(body.className, "text-sm text-[#2c2c2c]/60 text-center py-4")}>
                No comments yet. Be the first to roast!
              </p>
            ) : (
              topLevel.map((c) => (
                <EnhancedComment key={c._id} comment={c} allComments={reviews} targetId={id} targetModel="Resume" onRefresh={loadReviews} />
              ))
            )}
          </ComicCard>
        </div>
      </div>
    </div>
  );
}
