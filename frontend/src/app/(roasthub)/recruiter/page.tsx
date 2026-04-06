"use client";

import { cn } from "@/lib/utils";
import { apiFetch, getToken } from "@/lib/api";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Search, Briefcase, UserX } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center p-8 bg-card">
          <CardTitle className="font-heading uppercase text-3xl mb-4">Recruiter Access</CardTitle>
          <CardDescription className="mb-6 font-medium">Sign in with a recruiter account to discover candidates.</CardDescription>
          <Link href="/login">
            <Button className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all w-full font-heading uppercase text-lg h-12">
              Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-4xl font-heading uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-primary" /> Recruiter Discovery
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          Filter candidates by skills, AI score, talent composite, and role. Identity is hidden until opted in.
        </p>
      </div>

      <Card className="border-4 border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card">
        <CardHeader className="bg-muted border-b-4 border-border pb-4">
          <CardTitle className="font-heading uppercase text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 border-b-4 border-border">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Skills (comma separated)</label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Node..." className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
            </div>
            <div className="w-full sm:w-36">
              <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Min Resume</label>
              <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0-100" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
            </div>
            <div className="w-full sm:w-36">
              <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Min Talent</label>
              <Input value={minTalent} onChange={(e) => setMinTalent(e.target.value)} placeholder="0-100" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
            </div>
            <div className="w-full sm:w-48">
              <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Role Keyword</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0" />
            </div>
          </div>
        </CardContent>
        <div className="bg-muted p-4">
          <Button onClick={search} className="w-full sm:w-auto border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase text-sm bg-primary text-primary-foreground h-12 px-8 flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> Search Candidates
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        {rows.length === 0 ? (
          <div className="border-4 border-border border-dashed bg-muted/50 p-12 text-center text-muted-foreground font-heading uppercase tracking-widest">
            No results. Adjust filters and query again.
          </div>
        ) : rows.map((r) => (
          <Card key={r.resumeId} className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-border bg-primary/20 flex items-center justify-center text-xl font-heading uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                  {(r.userId?.anonymousUsername || r.candidateAlias)?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-heading text-xl uppercase">{r.userId?.anonymousUsername || r.candidateAlias || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground font-mono bg-muted inline-block px-2 py-0.5 border border-border">ID: {r.resumeId.slice(-6)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Badge variant="outline" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold uppercase py-1 bg-green-100">
                  Resume {r.aiScore?.overall ?? "—"}
                </Badge>
                <Badge variant="outline" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold uppercase py-1 bg-cyan-100">
                  Talent {r.talentComposite ?? "—"}
                </Badge>
                {r.identity ? (
                  <Badge variant="default" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold uppercase py-1 bg-yellow text-black">
                    Identity Available
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold uppercase py-1 gap-1">
                    <UserX className="w-3 h-3" /> Hidden
                  </Badge>
                )}
              </div>
            </div>
            {r.identity && (
              <div className="bg-muted p-4 border-t-4 border-border space-y-2">
                <p className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Contact Info</p>
                <div className="flex flex-wrap gap-4 text-sm font-medium">
                  {r.identity.displayName && <span className="flex items-center gap-2"><span className="underline decoration-2 decoration-primary underline-offset-4">{r.identity.displayName}</span></span>}
                  {r.identity.linkedInUrl && <a href={r.identity.linkedInUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-4">LinkedIn Profile</a>}
                  {r.identity.githubUrl && <a href={r.identity.githubUrl} target="_blank" rel="noreferrer" className="text-primary hover:opacity-80 underline decoration-2 underline-offset-4">GitHub Profile</a>}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
