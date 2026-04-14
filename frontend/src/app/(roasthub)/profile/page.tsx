"use client";

import { apiFetch, clearToken, type User as AuthUser } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FileText, LogOut, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumeCard } from "@/components/resume-card";
import { useAuth } from "@/store/auth";

function profileRowFromAuth(u: AuthUser): User {
  return {
    _id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "user",
    anonymousPublicId: u.anonymousUsername,
  };
}

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  anonymousPublicId?: string;
  publicProfile?: {
    displayName?: string;
    linkedInUrl?: string;
    githubUrl?: string;
    shareIdentityWithRecruiters?: boolean;
  };
  talentMetrics?: { composite: number };
};

type Resume = {
  _id: string;
  title?: string;
  version: number;
  status: string;
  aiScore?: { overall: number };
  createdAt?: string;
  userId?: { anonymousUsername?: string };
  candidateAlias?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [github, setGithub] = useState("");
  const [share, setShare] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!authUser) return;
    setDetailLoading(true);
    try {
      const u = await apiFetch<User & { id?: string }>("/api/auth/me");
      const raw = u.data;
      const row: User = raw
        ? {
            ...raw,
            _id: raw._id ?? (raw as { id?: string }).id ?? authUser.id,
            name: raw.name ?? authUser.name,
            email: raw.email ?? authUser.email,
            anonymousPublicId: (raw as { anonymousUsername?: string }).anonymousUsername ?? raw.anonymousPublicId ?? authUser.anonymousUsername,
          }
        : profileRowFromAuth(authUser);
      setUser(row);
      if (row.publicProfile) {
        setDisplayName(row.publicProfile.displayName || "");
        setLinkedIn(row.publicProfile.linkedInUrl || "");
        setGithub(row.publicProfile.githubUrl || "");
        setShare(row.publicProfile.shareIdentityWithRecruiters || false);
      }
      if (authUser.role !== "recruiter") {
        const r = await apiFetch<Resume[]>("/api/resumes/my");
        setResumes(r.data || []);
      } else {
        setResumes([]);
      }
    } catch {
      setUser(profileRowFromAuth(authUser));
    } finally {
      setDetailLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setUser(null);
      setResumes([]);
      setDetailLoading(false);
      return;
    }
    setUser(profileRowFromAuth(authUser));
    void loadDetails();
  }, [authLoading, authUser, loadDetails]);

  async function saveProfile() {
    try {
      await apiFetch("/api/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName, linkedInUrl: linkedIn, githubUrl: github, shareIdentityWithRecruiters: share }),
      });
      toast.success("Profile updated!");
      setEditMode(false);
      void loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (authLoading) {
    return (
      <div className="w-full py-8">
        <Skeleton className="h-48 w-full border-4 border-border rounded-none mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full border-4 border-border rounded-none" />
          <Skeleton className="h-64 w-full border-4 border-border rounded-none" />
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center p-8 bg-card flex flex-col items-center">
          <div className="w-16 h-16 bg-muted border-[3px] border-border rounded-full flex items-center justify-center mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <LogOut className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-3xl mb-3 tracking-wide">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-8 text-balance">You need to sign in to view your profile, manage your resumes, and interact with the community.</p>
          <Link href="/login" className="w-full">
            <Button className="w-full border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading tracking-wide">
              Sign In Now
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const displayUser = user ?? profileRowFromAuth(authUser);

  return (
    <div className="flex w-full min-w-0 flex-col gap-8 py-8">
      {/* User Header */}
      <Card className="shrink-0 border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-primary p-6 md:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full border-[3px] border-border bg-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-4xl font-heading shrink-0">
            {displayUser.name.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 text-center md:text-left text-primary-foreground space-y-2">
            <h1 className="text-3xl md:text-4xl font-heading tracking-tighter text-foreground">{displayUser.name}</h1>
            <p className="font-medium opacity-90">{displayUser.email}</p>
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mt-1">
              {displayUser.anonymousPublicId && (
                <span className="font-mono text-xs tracking-tight text-primary-foreground/70">u/{displayUser.anonymousPublicId}</span>
              )}
              {displayUser.talentMetrics && (
                <Badge variant="secondary" className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none font-bold px-3 py-1">
                  Talent Score: {displayUser.talentMetrics.composite}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Badge variant="outline" className="border-2 border-primary-foreground text-primary-foreground rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-primary/50 text-sm py-1.5 px-4 flex items-center justify-center md:justify-start gap-2 font-heading tracking-wide">
              <FileText className="w-4 h-4" /> {resumes.length} Resume{resumes.length !== 1 ? "s" : ""}
            </Badge>
            <Button
              variant="destructive"
              onClick={() => { clearToken(); router.push("/"); }}
              className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading text-xs tracking-wide w-full"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Public Profile Settings */}
        <div className="md:col-span-1">
          <Card className="border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b-[3px] border-border bg-muted/40">
              <CardTitle className="font-heading text-base tracking-wide">Public Profile</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading text-[10px] h-7 px-3"
              >
                <Edit2 className="w-3 h-3 mr-1" /> {editMode ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-heading text-xs">Display Name</label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-heading text-xs">LinkedIn URL</label>
                    <Input value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="LinkedIn URL" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-heading text-xs">GitHub URL</label>
                    <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-border bg-muted/50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-4">
                    <input type="checkbox" checked={share} onChange={() => setShare(!share)} className="w-4 h-4 accent-primary rounded-none border-2 border-border" />
                    <span className="text-sm font-bold tracking-tight uppercase">Share identity with recruiters</span>
                  </label>
                  <Button onClick={saveProfile} className="w-full border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading tracking-wide mt-4">
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Display Name</h4>
                    <p className="font-medium bg-muted p-2 border-2 border-border inline-block min-w-full text-sm">{displayUser.publicProfile?.displayName || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">LinkedIn</h4>
                    <p className="font-medium bg-muted p-2 border-2 border-border inline-block min-w-full text-sm truncate">{displayUser.publicProfile?.linkedInUrl || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">GitHub</h4>
                    <p className="font-medium bg-muted p-2 border-2 border-border inline-block min-w-full text-sm truncate">{displayUser.publicProfile?.githubUrl || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Visibility</h4>
                    <Badge variant={displayUser.publicProfile?.shareIdentityWithRecruiters ? "default" : "secondary"} className="border-2 border-border rounded-none font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-[10px] px-2 py-0.5">
                      {displayUser.publicProfile?.shareIdentityWithRecruiters ? "Shared with Recruiters" : "Anonymous"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumes — candidates only */}
        <div className="md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4 mt-2 md:mt-0 shrink-0">
            <h2 className="text-2xl font-heading tracking-wide uppercase">
              {authUser?.role === "recruiter" ? "Candidate discovery" : "Your Resumes"}
            </h2>
          </div>
          <div
            className="flex flex-col gap-4 overflow-y-auto overscroll-y-contain max-h-[800px] md:max-h-[calc(100vh-16rem)] rounded-none border-[3px] border-border bg-muted/20 p-4 sm:p-6 [scrollbar-gutter:stable]"
            aria-label={authUser?.role === "recruiter" ? "Recruiter tools" : "Your resumes"}
          >
            {authUser?.role === "recruiter" ? (
              detailLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-48 w-full border-[3px] border-border rounded-none" />
                </div>
              ) : (
                <Card className="border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-card p-8 text-center">
                  <CardDescription className="text-base font-medium text-foreground mb-4">
                    Recruiter accounts don&apos;t upload resumes or projects. Use the dashboard to search candidates.
                  </CardDescription>
                  <Link href="/recruiter">
                    <Button className="border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading tracking-wide px-6">
                      Open recruiter dashboard
                    </Button>
                  </Link>
                </Card>
              )
            ) : detailLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-48 w-full border-[3px] border-border rounded-none" />
                <Skeleton className="h-48 w-full border-[3px] border-border rounded-none" />
              </div>
            ) : resumes.length === 0 ? (
              <Card className="border-[3px] border-border border-dashed bg-muted/30 rounded-none text-center p-10 flex-1 flex flex-col items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                <CardDescription className="text-base font-medium text-foreground mb-1">
                  No resumes uploaded yet
                </CardDescription>
                <p className="text-sm text-muted-foreground mb-6">Drop your first PDF to get roasted by the community.</p>
                <Link href="/upload">
                  <Button className="border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading tracking-wide px-6">
                    Upload Resume
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {resumes.map((r) => (
                  <ResumeCard key={r._id} id={r._id} title={r.title} version={r.version} status={r.status} overall={r.aiScore?.overall} createdAt={r.createdAt} candidateAlias={r.candidateAlias || r.userId?.anonymousUsername || "Anonymous"} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
