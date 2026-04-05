"use client";

import { ComicCard } from "@/components/comic-card";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch, getToken } from "@/lib/api";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { FaSearch, FaBriefcase, FaUserSecret } from "react-icons/fa";
import Link from "next/link";

type CandidateRow = {
  resumeId: string;
  aiScore?: { overall: number };
  userId?: { anonymousUsername?: string };
  candidateAlias?: string;
  talentComposite?: number;
  identity?: { displayName?: string; linkedInUrl?: string; githubUrl?: string } | null;
};

export default function RecruiterPage() {
  const token = getToken();
  const [skills, setSkills] = useState("");
  const [minScore, setMinScore] = useState("");
  const [minTalent, setMinTalent] = useState("");
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<CandidateRow[]>([]);

  const search = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (skills) q.set("skills", skills);
      if (minScore) q.set("minScore", minScore);
      if (minTalent) q.set("minTalentScore", minTalent);
      if (role) q.set("role", role);
      const res = await apiFetch<CandidateRow[]>(`/api/recruiter/candidates?${q.toString()}`);
      setRows(res.data || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed (recruiter role required)");
      setRows([]);
    }
  }, [skills, minScore, minTalent, role]);

  if (!token) {
    return (
      <div className="flex items-center justify-center py-16">
        <ComicCard variant="yellow" shadow="large" className="text-center max-w-md">
          <h1 className={cn(display.className, "text-3xl mb-2")}>Recruiter Access</h1>
          <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 mb-4")}>Sign in with a recruiter account to discover candidates.</p>
          <Link href="/login" className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-base")}>Sign In</Link>
        </ComicCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className={cn(display.className, "text-3xl")}><FaBriefcase className="inline mr-2" />Recruiter Discovery</h1>
      <p className={cn(body.className, "text-sm text-[#2c2c2c]/70")}>
        Filter candidates by skills, resume AI score, talent composite, and role keyword. Identity is hidden unless candidates opt in.
      </p>

      <ComicCard variant="cream" shadow="medium">
        <p className={cn(display.className, "text-base mb-3")}>Filters</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma)" className={cn(body.className, "flex-1 min-w-[140px] p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
          <input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="Min resume score" className={cn(body.className, "w-36 p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
          <input value={minTalent} onChange={(e) => setMinTalent(e.target.value)} placeholder="Min talent score" className={cn(body.className, "w-36 p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role keyword" className={cn(body.className, "w-36 p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
          <button type="button" onClick={search} className={cn(display.className, "comic-btn bg-orange-400 comic-shadow-3 comic-lift text-sm")}>
            <FaSearch /> Search
          </button>
        </div>
      </ComicCard>

      <div className="grid gap-3">
        {rows.length === 0 ? (
          <ComicCard variant="light" shadow="small" className="text-center py-8">
            <p className={cn(body.className, "text-sm text-[#2c2c2c]/60")}>No results (or not authorized as recruiter). Click Search to query.</p>
          </ComicCard>
        ) : rows.map((r) => (
          <ComicCard key={r.resumeId} variant="peach" shadow="small">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full comic-border-2 bg-teal flex items-center justify-center text-lg font-bold">
                  {(r.userId?.anonymousUsername || r.candidateAlias)?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className={cn(display.className, "text-base")}>{r.userId?.anonymousUsername || r.candidateAlias || "Anonymous"}</p>
                  <p className={cn(body.className, "text-xs text-[#2c2c2c]/60")}>Resume {r.resumeId.slice(-6)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={cn(display.className, "rounded-full comic-border-2 bg-green-400 px-3 py-0.5 text-xs comic-shadow-2")}>Resume {r.aiScore?.overall ?? "—"}</span>
                <span className={cn(display.className, "rounded-full comic-border-2 bg-cyan-400 px-3 py-0.5 text-xs comic-shadow-2")}>Talent {r.talentComposite ?? "—"}</span>
                {r.identity ? (
                  <span className={cn(display.className, "rounded-full comic-border-2 bg-yellow px-3 py-0.5 text-xs comic-shadow-2")}>Identity shared</span>
                ) : (
                  <span className={cn(display.className, "rounded-full comic-border-2 bg-beige px-3 py-0.5 text-xs comic-shadow-2")}><FaUserSecret className="inline mr-1" />Hidden</span>
                )}
              </div>
            </div>
            {r.identity && (
              <div className={cn(body.className, "mt-2 text-xs text-[#2c2c2c]/70 space-x-3")}>
                {r.identity.displayName && <span>{r.identity.displayName}</span>}
                {r.identity.linkedInUrl && <a href={r.identity.linkedInUrl} target="_blank" rel="noreferrer" className="underline">LinkedIn</a>}
                {r.identity.githubUrl && <a href={r.identity.githubUrl} target="_blank" rel="noreferrer" className="underline">GitHub</a>}
              </div>
            )}
          </ComicCard>
        ))}
      </div>
    </div>
  );
}
