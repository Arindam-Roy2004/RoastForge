"use client";

import { apiFetch, authApi, type User as AuthUser } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FileText, LogOut, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResumeCard } from "@/components/resume-card";
import { useAuth } from "@/store/auth";
import { motion } from "motion/react";

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

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
    targetRole?: string;
    skills?: string[];
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
  const { user: authUser, loading: authLoading, logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [github, setGithub] = useState("");
  const [share, setShare] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  // Skills are edited as a comma-separated string for a single-field UX;
  // we normalize + dedupe to an array right before sending to the API.
  const [skillsInput, setSkillsInput] = useState("");
  // Delete-account dialog state. Typed-email confirmation replaces the legacy
  // password check now that accounts authenticate exclusively via Google.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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
        setTargetRole(row.publicProfile.targetRole || "");
        setSkillsInput((row.publicProfile.skills || []).join(", "));
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

  const isRecruiter = authUser?.role === "recruiter";

  async function confirmDeleteAccount() {
    if (!authUser) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount(deleteConfirm.trim());
      // Server already cleared the refresh cookie; clear our local token + user
      // state by routing through the same logout path the Sign Out button uses.
      await logout();
      toast.success("Account deleted");
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  }

  async function saveProfile() {
    try {
      // Recruiters don't own candidate search fields; only send what applies to them.
      // The backend enforces this too, but filtering here keeps payloads clean.
      const body: Record<string, unknown> = {
        displayName,
        linkedInUrl: linkedIn,
        githubUrl: github,
      };
      if (!isRecruiter) {
        // Split commas → trim → dedupe. Server normalizes again (lowercase/cap) as defense in depth.
        const parsedSkills = Array.from(
          new Set(
            skillsInput
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ).slice(0, 25);
        body.shareIdentityWithRecruiters = share;
        body.targetRole = targetRole;
        body.skills = parsedSkills;
      }
      await apiFetch("/api/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
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
        <Skeleton className="h-48 w-full border border-border rounded-lg mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full border border-border rounded-lg" />
          <Skeleton className="h-64 w-full border border-border rounded-lg" />
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border border-border rounded-lg shadow-[var(--shadow-md)] text-center p-8 bg-card flex flex-col items-center">
          <div className="w-16 h-16 bg-muted border border-border rounded-full flex items-center justify-center mb-6 shadow-[var(--shadow-2xs)]">
            <LogOut className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-3xl mb-3 tracking-wide">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-8 text-balance">You need to sign in to view your profile, manage your resumes, and interact with the community.</p>
          <Link href="/login" className="w-full">
            <Button className="w-full border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading tracking-wide">
              Sign In Now
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const displayUser = user ?? profileRowFromAuth(authUser);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="flex w-full min-w-0 flex-col gap-8 py-8"
    >
      {/* User Header */}
      <motion.div variants={itemVariants}>
        <Card className="shrink-0 border border-border rounded-lg overflow-hidden shadow-[var(--shadow-md)] bg-card">
          <div className="flex flex-col items-center gap-6 border-b-2 border-border bg-accent p-6 md:flex-row md:p-10">
            <div className="w-24 h-24 rounded-full border border-border bg-background shadow-[var(--shadow-sm)] flex items-center justify-center text-4xl font-mono font-semibold shrink-0">
              {displayUser.name.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-center text-accent-foreground md:text-left">
              <h1 className="text-3xl md:text-4xl font-mono font-semibold tracking-normal text-balance break-words leading-snug text-accent-foreground">
                {displayUser.name}
              </h1>
              <p className="break-all font-sans font-medium text-accent-foreground/80">{displayUser.email}</p>
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mt-1">
                {displayUser.anonymousPublicId && (
                  <span className="font-mono text-xs tracking-normal text-accent-foreground/70">u/{displayUser.anonymousPublicId}</span>
                )}
                {/* Talent score is candidate-only; recruiters never receive talentMetrics from the API. */}
                {!isRecruiter && displayUser.talentMetrics && (
                  <Badge variant="secondary" className="border border-border shadow-[var(--shadow-2xs)] rounded-md font-bold px-3 py-1 bg-card">
                    Talent Score: {Number(displayUser.talentMetrics.composite).toFixed(2)}
                  </Badge>
                )}
                {isRecruiter && (
                  <Badge variant="secondary" className="border border-border shadow-[var(--shadow-2xs)] rounded-md font-bold px-3 py-1 uppercase bg-card">
                    Recruiter
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
              {/* Resume count badge is meaningless for recruiters (they can't upload). */}
              {!isRecruiter && (
                <Badge variant="outline" className="flex items-center justify-center gap-2 rounded-md border-2 border-border bg-card px-4 py-1.5 text-sm text-foreground md:justify-start">
                  <FileText className="w-4 h-4" /> {resumes.length} Resume{resumes.length !== 1 ? "s" : ""}
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={async () => { await logout(); router.push("/"); }}
                className="w-full cursor-pointer rounded-md border-2 border-border bg-card text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Public Profile Settings */}
        <motion.div variants={itemVariants} className="md:col-span-1 flex flex-col">
          <Card className="border border-border rounded-lg shadow-[var(--shadow-md)] flex flex-col bg-card">
            <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b border-border bg-muted/40">
              <CardTitle className="font-heading text-base tracking-wide">Public Profile</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="border border-border shadow-[var(--shadow-2xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading text-[10px] h-7 px-3 cursor-pointer"
              >
                <Edit2 className="w-3 h-3 mr-1" /> {editMode ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-heading text-xs">Display Name</label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="border border-border rounded-lg bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-heading text-xs">LinkedIn URL</label>
                    <Input value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="LinkedIn URL" className="border border-border rounded-lg bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-heading text-xs">GitHub URL</label>
                    <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL" className="border border-border rounded-lg bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)]" />
                  </div>
                  {/* Target Role, Skills, and share-identity are candidate-only —
                      they power the recruiter search. Recruiters don't appear in that
                      search so these fields would just be noise on their profile. */}
                  {!isRecruiter && (
                    <>
                      <div className="space-y-1">
                        <label className="font-heading text-xs">Target Role</label>
                        <Input
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          placeholder="e.g. Backend Engineer"
                          maxLength={80}
                          className="border border-border rounded-lg bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-heading text-xs">Skills</label>
                        <Input
                          value={skillsInput}
                          onChange={(e) => setSkillsInput(e.target.value)}
                          placeholder="react, python, aws..."
                          className="border border-border rounded-lg bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)]"
                        />
                        <p className="text-[10px] text-muted-foreground font-medium tracking-tight">Comma-separated. Up to 25. Used by recruiter search.</p>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-border bg-muted/30 shadow-[var(--shadow-2xs)] mt-4 transition-all hover:bg-muted/50">
                        <input type="checkbox" checked={share} onChange={() => setShare(!share)} className="w-4 h-4 accent-primary rounded-lg border border-border cursor-pointer" />
                        <span className="text-sm font-bold tracking-tight uppercase">Share identity with recruiters</span>
                      </label>
                    </>
                  )}
                  <Button onClick={saveProfile} className="w-full border border-border shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading tracking-wide mt-4 cursor-pointer">
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Display Name</h4>
                    <p className="font-mono font-medium bg-muted/50 p-2.5 border border-border inline-block min-w-full text-sm tracking-normal text-balance break-words">
                      {displayUser.publicProfile?.displayName || "—"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">LinkedIn</h4>
                    <p className="font-medium bg-muted/50 p-2.5 border border-border inline-block min-w-full text-sm truncate">{displayUser.publicProfile?.linkedInUrl || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">GitHub</h4>
                    <p className="font-medium bg-muted/50 p-2.5 border border-border inline-block min-w-full text-sm truncate">{displayUser.publicProfile?.githubUrl || "—"}</p>
                  </div>
                  {/* Same rationale as the edit form: candidate-only sections
                      are hidden for recruiter accounts. */}
                  {!isRecruiter && (
                    <>
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Target Role</h4>
                        <p className="font-medium bg-muted/50 p-2.5 border border-border inline-block min-w-full text-sm truncate">{displayUser.publicProfile?.targetRole || "—"}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Skills</h4>
                        {displayUser.publicProfile?.skills && displayUser.publicProfile.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {displayUser.publicProfile.skills.map((s) => (
                              <Badge key={s} variant="outline" className="border border-border rounded-md font-bold uppercase shadow-[var(--shadow-2xs)] text-[10px] px-2 py-0.5 bg-card">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="font-medium bg-muted/50 p-2.5 border border-border inline-block min-w-full text-sm">—</p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Visibility</h4>
                        <Badge variant={displayUser.publicProfile?.shareIdentityWithRecruiters ? "default" : "secondary"} className="border border-border rounded-md font-bold uppercase shadow-[var(--shadow-2xs)] text-[10px] px-2 py-0.5">
                          {displayUser.publicProfile?.shareIdentityWithRecruiters ? "Shared with Recruiters" : "Anonymous"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Resumes — candidates only */}
        <motion.div variants={itemVariants} className="md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4 mt-2 md:mt-0 shrink-0">
            <h2 className="text-2xl font-heading tracking-wide uppercase">
              {authUser?.role === "recruiter" ? "Candidate discovery" : "Your Resumes"}
            </h2>
          </div>
          <div
            className="flex flex-col gap-4 overflow-y-auto overscroll-y-contain max-h-[500px] rounded-lg border border-border bg-muted/20 p-4 sm:p-6 [scrollbar-gutter:stable]"
            aria-label={authUser?.role === "recruiter" ? "Recruiter tools" : "Your resumes"}
          >
            {authUser?.role === "recruiter" ? (
              detailLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-48 w-full border border-border rounded-lg" />
                </div>
              ) : (
                <Card className="border border-border rounded-lg shadow-[var(--shadow-sm)] bg-card p-8 text-center">
                  <CardDescription className="text-base font-medium text-foreground mb-4">
                    Recruiter accounts don&apos;t upload resumes or projects. Use the dashboard to search candidates.
                  </CardDescription>
                  <Link href="/recruiter">
                    <Button className="border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading tracking-wide px-6 cursor-pointer">
                      Open recruiter dashboard
                    </Button>
                  </Link>
                </Card>
              )
            ) : detailLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-48 w-full border border-border rounded-lg animate-pulse" />
                <Skeleton className="h-48 w-full border border-border rounded-lg animate-pulse" />
              </div>
            ) : resumes.length === 0 ? (
              <Card className="border border-border border-dashed bg-muted/30 rounded-lg text-center p-10 flex-1 flex flex-col items-center justify-center shadow-none hover:shadow-[var(--shadow-sm)] hover:translate-y-0 active:translate-y-0 transition-colors">
                <FileText className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                <CardDescription className="text-base font-medium text-foreground mb-1">
                  No resumes uploaded yet
                </CardDescription>
                <p className="text-sm text-muted-foreground mb-6">Drop your first PDF to get roasted by the community.</p>
                <Link href="/upload">
                  <Button className="border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg font-heading tracking-wide px-6 cursor-pointer">
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
        </motion.div>
      </div>

      {/* Danger zone — a single small button. The typed-email confirmation
          dialog already explains the consequences, so the page-level warning
          card was overkill. */}
      <motion.div variants={itemVariants} className="flex justify-end pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setDeleteConfirm(""); setDeleteOpen(true); }}
          className="h-8 rounded-lg border border-destructive/60 px-3 font-heading text-[11px] uppercase tracking-wider text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
          data-testid="button-open-delete-account"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete account
        </Button>
      </motion.div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-lg border border-destructive shadow-[var(--shadow-lg)] sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wide text-destructive">Delete account?</DialogTitle>
            <DialogDescription>
              This permanently removes your profile, resumes, projects, comments, likes, and votes.
              Type <span className="font-mono font-bold text-foreground">{authUser?.email}</span> below to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={authUser?.email || "your email"}
              autoComplete="off"
              className="rounded-lg border border-border bg-background shadow-none focus-visible:ring-2 focus-visible:ring-destructive/40 transition-all focus:shadow-[var(--shadow-2xs)]"
              data-testid="input-confirm-email"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleting ||
                !authUser?.email ||
                deleteConfirm.trim().toLowerCase() !== authUser.email.toLowerCase()
              }
              onClick={confirmDeleteAccount}
              className="rounded-lg border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all font-heading text-xs cursor-pointer"
              data-testid="button-confirm-delete-account"
            >
              {deleting ? "Deleting..." : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
