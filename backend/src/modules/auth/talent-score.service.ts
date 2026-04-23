import mongoose from "mongoose";
import Resume from "../resume/resume.model.js";
import User from "./auth.model.js";

/**
 * Computes a user's composite talent score (0–100) and persists it on
 * `User.talentMetrics.composite`. The formula is intentionally simple so it is
 * easy to reason about and audit:
 *
 *   base      = avg(aiRoast.score) across the user's resumes, or 0 if none
 *   likeBonus = min(10, floor(totalLikes / 5))   // every 5 likes → +1, capped at +10
 *   dislikePenalty = min(5, floor(totalDislikes / 8))  // every 8 dislikes → -1, capped at -5
 *   composite = clamp(0..100, base + likeBonus - dislikePenalty)
 *
 * Recruiters never have a talent score — they don't upload resumes or projects,
 * so the score is meaningless for them and showing "0" looks like a broken UI.
 * We short-circuit before the aggregate so we don't even run the pipeline.
 *
 * We run both aggregates in a single pipeline to keep it to one DB round-trip.
 * Callers should treat this as fire-and-forget (see `safeRecalcTalentScore`),
 * since scoring failures must never break the main request flow.
 */
export const recalcTalentScore = async (userId: string): Promise<number> => {
  if (!mongoose.isValidObjectId(userId)) return 0;

  // Recruiters are excluded from talent scoring entirely.
  const user = await User.findById(userId).select("role").lean();
  if (!user || user.role === "recruiter") return 0;

  const [stats] = await Resume.aggregate<{ avgScore: number | null; totalLikes: number; totalDislikes: number }>([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: "$aiRoast.score" },
        // $ifNull: legacy resumes may omit these counters until first reaction / backfill.
        totalLikes: { $sum: { $ifNull: ["$likesCount", 0] } },
        totalDislikes: { $sum: { $ifNull: ["$dislikesCount", 0] } },
      },
    },
  ]);

  const base = Math.max(0, Math.min(100, Number(stats?.avgScore) || 0));
  const totalLikes = Math.max(0, Number(stats?.totalLikes) || 0);
  const totalDislikes = Math.max(0, Number(stats?.totalDislikes) || 0);
  const likeBonus = Math.min(10, Math.floor(totalLikes / 5));
  const dislikePenalty = Math.min(5, Math.floor(totalDislikes / 8));
  const composite = Math.max(0, Math.min(100, base + likeBonus - dislikePenalty));

  await User.findByIdAndUpdate(userId, {
    $set: { "talentMetrics.composite": composite },
  });

  return composite;
};

/**
 * Fire-and-forget wrapper. Use from hot request paths (analysis, like toggle,
 * resume delete) where a scoring hiccup must not bubble up to the client.
 */
export const safeRecalcTalentScore = (userId: string): void => {
  recalcTalentScore(userId).catch((err) => {
    console.error("[talent-score] recalc failed", { userId, err });
  });
};
