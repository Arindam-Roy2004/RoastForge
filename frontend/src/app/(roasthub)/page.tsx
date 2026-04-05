"use client";

import { ComicCard } from "@/components/comic-card";
import { ResumeCard } from "@/components/resume-card";
import { SearchBar } from "@/components/search-bar";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Resume = {
  _id: string;
  version: number;
  status: string;
  aiScore?: { overall: number };
  createdAt?: string;
  candidateAlias?: string;
};

export default function HomePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Resume[]>("/api/resume/my-resumes");
      setResumes(res.data || []);
    } catch {
      /* not logged in or empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return resumes;
    const q = search.toLowerCase();
    return resumes.filter(
      (r) =>
        r.candidateAlias?.toLowerCase().includes(q) ||
        `v${r.version}`.includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [resumes, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <ComicCard variant="teal" shadow="large" className="text-center">
          <p className={cn(display.className, "text-2xl animate-pulse")}>Loading resumes...</p>
        </ComicCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <ComicCard variant="teal" shadow="large" className="text-center">
        <h1 className={cn(display.className, "text-3xl sm:text-4xl mb-2")}>
          Welcome to SignalTalent! 🔥
        </h1>
        <p className={cn(body.className, "text-base text-[#2c2c2c]/80")}>
          Upload your resume, get community roasts, AI analysis, and let recruiters discover your
          signal. Ready to be roasted?
        </p>
      </ComicCard>

      {/* Search */}
      {resumes.length > 0 && (
        <ComicCard variant="cream" shadow="small" className="py-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search resumes by alias, version, or status..."
          />
        </ComicCard>
      )}

      {/* Grid */}
      {resumes.length === 0 ? (
        <ComicCard variant="peach" shadow="medium" className="text-center py-12">
          <h2 className={cn(display.className, "text-2xl mb-2")}>No Resumes Yet!</h2>
          <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 mb-4")}>
            Be the first to upload your resume and get some feedback!
          </p>
          <Link
            href="/upload"
            className={cn(
              display.className,
              "comic-btn bg-green-400 comic-shadow-3 comic-lift text-base",
            )}
          >
            Upload Resume
          </Link>
        </ComicCard>
      ) : filtered.length === 0 && search ? (
        <ComicCard variant="peach" shadow="medium" className="text-center py-12">
          <h2 className={cn(display.className, "text-2xl mb-2")}>No Resumes Found</h2>
          <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 mb-4")}>
            No resumes match &ldquo;{search}&rdquo;. Try a different term!
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className={cn(display.className, "comic-btn bg-beige comic-shadow-3 comic-lift")}
          >
            Clear Search
          </button>
        </ComicCard>
      ) : (
        <>
          <h2 className={cn(display.className, "text-2xl")}>Resumes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <ResumeCard
                key={r._id}
                id={r._id}
                version={r.version}
                status={r.status}
                overall={r.aiScore?.overall}
                createdAt={r.createdAt}
                candidateAlias={r.candidateAlias}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
