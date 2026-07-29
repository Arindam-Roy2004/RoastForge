"use client";

import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useCallback, useState } from "react";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";
import { Search, Briefcase, UserX, Loader2, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type CandidateRow = {
  resumeId: string;
  candidateUserId?: string;
  aiScore?: { overall: number };
  userId?: { anonymousUsername?: string };
  candidateAlias?: string;
  talentComposite?: number;
  targetRole?: string;
  skills?: string[];
  // Number of this candidate's resumes that matched the filters. The card shows
  // the top-scoring one; anything >1 is a cue to click through to the portfolio.
  resumeCount?: number;
  identity?: { displayName?: string; linkedInUrl?: string; githubUrl?: string } | null;
};

export default function RecruiterPage() {
  const { user, loading: authLoading } = useAuth();
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-4 py-16 min-h-[40vh]">
        <Card className="w-full max-w-md border border-border rounded-lg shadow-[var(--shadow-md)] bg-card text-center p-8 flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-muted-foreground animate-spin mb-4" />
          <CardTitle className="font-heading  text-xl mb-1 tracking-tighter">Loading…</CardTitle>
          <CardDescription className="font-medium">Checking your session.</CardDescription>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border border-border rounded-lg shadow-[var(--shadow-md)] bg-card text-center p-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-muted border border-border rounded-full flex items-center justify-center mb-6 shadow-[var(--shadow-xs)]">
            <Briefcase className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="font-heading  text-3xl mb-3 tracking-tighter">Recruiter Access</CardTitle>
          <CardDescription className="mb-8 font-medium">Sign in with a recruiter account to discover candidates.</CardDescription>
          <Link href="/login" className="w-full">
            <Button className="w-full border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-lg h-12 tracking-wide">
              Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (user.role !== "recruiter") {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border border-border rounded-lg shadow-[var(--shadow-md)] bg-card text-center p-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-muted border border-border rounded-full flex items-center justify-center mb-6 shadow-[var(--shadow-xs)]">
            <Briefcase className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="font-heading  text-2xl mb-3 tracking-tighter">Recruiters only</CardTitle>
          <CardDescription className="mb-6 font-medium">This workspace is for recruiter accounts.</CardDescription>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full border border-border rounded-lg font-heading h-12">
              Back to hub
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div>
          <h1 className="text-4xl font-heading flex items-center gap-3 tracking-tighter ">
          <Briefcase className="w-8 h-8 text-primary-strong" /> Recruiter Discovery
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          Filter candidates by skills, AI score, talent composite, and role. Identity is hidden until opted in.
        </p>
      </div>

      <Card className="border border-border rounded-lg shadow-[var(--shadow-md)] bg-card">
        <CardHeader className="bg-muted/40 border-b border-border py-4 px-5">
          <CardTitle className="font-heading text-base tracking-wide">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-end gap-4 p-5">
            <div className="space-y-2 flex-1 w-full min-w-50">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Role</label>
              <Input placeholder="e.g. Backend Engineer" value={role} onChange={(e) => setRole(e.target.value)} className="border border-border rounded-lg shadow-[var(--shadow-xs)] h-10" />
            </div>
            <div className="space-y-2 flex-2 w-full">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Skills</label>
              <Input placeholder="React, Python, AWS..." value={skills} onChange={(e) => setSkills(e.target.value)} className="border border-border rounded-lg shadow-[var(--shadow-xs)] h-10" />
            </div>
            <div className="space-y-2 w-full md:w-32">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Min AI Score</label>
              <Input type="number" placeholder="0-100" value={minScore} onChange={(e) => setMinScore(e.target.value)} className="border border-border rounded-lg shadow-[var(--shadow-xs)] h-10" />
            </div>
            <div className="space-y-2 w-full md:w-32">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Min Talent</label>
              <Input type="number" placeholder="0-100" value={minTalent} onChange={(e) => setMinTalent(e.target.value)} className="border border-border rounded-lg shadow-[var(--shadow-xs)] h-10" />
            </div>
          </CardContent>
        <div className="bg-muted p-4 border-t border-border">
          <Button onClick={search} className="w-full sm:w-auto border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-sm bg-primary text-primary-foreground h-12 px-8 flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> Search Candidates
          </Button>
        </div>
      </Card>

      {/* Results container: bordered panel with its own header strip and an
          internally-scrollable body. Caps the viewport footprint so a large
          result set stays scannable instead of making the whole page scroll.
          `[scrollbar-gutter:stable]` keeps the card grid from shifting when
          the scrollbar appears/disappears on re-query. */}
      <Card className="border border-border rounded-lg shadow-[var(--shadow-md)] bg-card overflow-hidden">
        <CardHeader className="bg-muted/40 border-b border-border py-4 px-5 flex flex-row items-center justify-between space-y-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {rows.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRows([])}
                aria-label="Back to filters"
                data-testid="button-back-results"
                className="h-8 px-3 gap-1.5 border border-border rounded-lg shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-[11px] tracking-wider uppercase"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} />
                Back
              </Button>
            )}
            <CardTitle className="font-heading text-base tracking-wide">Results</CardTitle>
          </div>
          <Badge variant="secondary" className="border border-border shadow-[var(--shadow-2xs)] rounded-md font-bold uppercase text-[10px] px-2 py-0.5">
            {rows.length} {rows.length === 1 ? "Candidate" : "Candidates"}
          </Badge>
        </CardHeader>
        <div
          className="max-h-[70vh] overflow-y-auto overscroll-y-contain p-4 sm:p-6 [scrollbar-gutter:stable]"
          aria-label="Candidate search results"
        >
        {rows.length === 0 ? (
          <div className="border border-border border-dashed bg-muted/50 p-12 text-center text-muted-foreground font-heading tracking-widest">
            No results. Adjust filters and query again.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((r) => (
              <Card key={r.resumeId} className="border border-border rounded-lg shadow-[var(--shadow-sm)] bg-card flex flex-col h-full min-h-104">
                <CardHeader className="border-b border-border bg-muted/40 py-4 px-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/20 border border-border rounded-full flex items-center justify-center font-mono text-sm font-bold uppercase shrink-0">
                      {(r.userId?.anonymousUsername || r.candidateAlias)?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="font-mono text-sm font-bold tracking-tight truncate mb-1">
                        u/{r.userId?.anonymousUsername || r.candidateAlias || "Anonymous"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {r.resumeId.slice(-6)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-[10px] px-2 py-0.5 font-bold uppercase">
                      Resume {r.aiScore?.overall ?? "—"}
                    </Badge>
                    <Badge variant="outline" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-[10px] px-2 py-0.5 font-bold uppercase">
                      Talent {r.talentComposite != null ? Number(r.talentComposite).toFixed(2) : "—"}
                    </Badge>
                    {/* Backend collapses a candidate's matching resumes into one card
                        and returns the top-scoring one. If they have more that also
                        matched the filters, surface a count so the recruiter knows
                        to open the full portfolio to see the rest. */}
                    {r.resumeCount && r.resumeCount > 1 && (
                      <Badge variant="secondary" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-[10px] px-2 py-0.5 font-bold uppercase gap-1">
                        <FileText className="w-3 h-3" /> +{r.resumeCount - 1} more
                      </Badge>
                    )}
                    {r.identity ? (
                      <Badge variant="default" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-[10px] px-2 py-0.5 font-bold uppercase">
                        Identity Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-[10px] px-2 py-0.5 font-bold uppercase gap-1">
                        <UserX className="w-3 h-3" /> Hidden
                      </Badge>
                    )}
                  </div>
                  {r.targetRole && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Target Role</p>
                      <Badge variant="secondary" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-xs px-2 py-1 font-bold">
                        {r.targetRole}
                      </Badge>
                    </div>
                  )}
                  {r.skills && r.skills.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.skills.slice(0, 6).map((s) => (
                          <Badge key={s} variant="outline" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-[10px] px-2 py-0.5 font-bold uppercase">
                            {s}
                          </Badge>
                        ))}
                        {r.skills.length > 6 && (
                          <Badge variant="outline" className="border border-border shadow-[var(--shadow-2xs)] rounded-md text-[10px] px-2 py-0.5 font-bold uppercase">
                            +{r.skills.length - 6}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {r.identity && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Contact Info</p>
                      <div className="flex flex-wrap gap-4 text-sm font-medium">
                        {r.identity.displayName && <span className="flex items-center gap-2"><span className="underline decoration-2 decoration-primary underline-offset-4">{r.identity.displayName}</span></span>}
                        {r.identity.linkedInUrl && <a href={r.identity.linkedInUrl} target="_blank" rel="noreferrer" className="text-foreground underline decoration-2 decoration-primary underline-offset-4 transition-colors hover:text-primary-strong">LinkedIn Profile</a>}
                        {r.identity.githubUrl && <a href={r.identity.githubUrl} target="_blank" rel="noreferrer" className="text-foreground underline decoration-2 decoration-primary underline-offset-4 transition-colors hover:text-primary-strong">GitHub Profile</a>}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 border-t border-border bg-muted/20 flex flex-col gap-2">
                  {r.candidateUserId ? (
                    <Link href={`/recruiter/candidate/${r.candidateUserId}`} className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border border-border rounded-lg shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs h-9"
                      >
                        View portfolio
                      </Button>
                    </Link>
                  ) : null}
                  <Link href={`/resume/${r.resumeId}`} className="w-full">
                    <Button
                      size="sm"
                      className="w-full border border-border rounded-lg shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs h-9"
                    >
                      Open resume
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        </div>
      </Card>
    </div>
  );
}
