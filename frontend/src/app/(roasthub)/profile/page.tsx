"use client";

import { ComicCard } from "@/components/comic-card";
import { ResumeCard } from "@/components/resume-card";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch, clearToken } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaFileAlt, FaSignOutAlt, FaEdit } from "react-icons/fa";
import { toast } from "sonner";

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
  version: number;
  status: string;
  aiScore?: { overall: number };
  createdAt?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [github, setGithub] = useState("");
  const [share, setShare] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await apiFetch<User>("/api/auth/me");
      setUser(u.data || null);
      if (u.data?.publicProfile) {
        setDisplayName(u.data.publicProfile.displayName || "");
        setLinkedIn(u.data.publicProfile.linkedInUrl || "");
        setGithub(u.data.publicProfile.githubUrl || "");
        setShare(u.data.publicProfile.shareIdentityWithRecruiters || false);
      }
      const r = await apiFetch<Resume[]>("/api/resumes/my");
      setResumes(r.data || []);
    } catch {
      /* not logged in */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    try {
      await apiFetch("/api/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName, linkedInUrl: linkedIn, githubUrl: github, shareIdentityWithRecruiters: share }),
      });
      toast.success("Profile updated!");
      setEditMode(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <ComicCard variant="peach" shadow="medium" className="text-center font-bold">
          Loading profile...
        </ComicCard>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <ComicCard variant="yellow" shadow="large" className="text-center max-w-md">
          <h1 className={cn(display.className, "text-3xl mb-2")}>Sign In Required</h1>
          <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 mb-4")}>
            You need to sign in to view your profile and manage your resumes.
          </p>
          <Link href="/login" className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-base")}>
            🚀 Sign In Now
          </Link>
        </ComicCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User card */}
      <ComicCard variant="teal" shadow="large">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-full comic-border-4 bg-yellow flex items-center justify-center text-3xl font-bold shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className={cn(display.className, "text-2xl")}>{user?.name || "Loading..."}</h1>
            {user?.email && <p className={cn(body.className, "text-sm text-[#2c2c2c]/70")}>{user.email}</p>}
            {user?.anonymousPublicId && <p className={cn(body.className, "text-xs text-[#2c2c2c]/50")}>Alias: {user.anonymousPublicId}</p>}
            {user?.talentMetrics && (
              <span className={cn(display.className, "inline-block mt-1 rounded-full comic-border-2 bg-green-400 px-3 py-0.5 text-xs comic-shadow-2")}>
                Talent Score: {user.talentMetrics.composite}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(display.className, "comic-pill bg-cream comic-shadow-2")}>
              <FaFileAlt /> {resumes.length} Resume{resumes.length !== 1 ? "s" : ""}
            </span>
            <button type="button" onClick={() => { clearToken(); router.push("/"); }} className={cn(display.className, "comic-btn bg-red-400 comic-shadow-3 comic-lift text-sm")}>
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </div>
      </ComicCard>

      {/* Public profile settings */}
      <ComicCard variant="cream" shadow="medium">
        <div className="flex items-center justify-between mb-3">
          <p className={cn(display.className, "text-lg")}>Public Profile</p>
          <button type="button" onClick={() => setEditMode(!editMode)} className={cn(display.className, "comic-btn bg-blue-300 comic-shadow-2 comic-lift text-xs")}>
            <FaEdit /> {editMode ? "Cancel" : "Edit"}
          </button>
        </div>
        {editMode ? (
          <div className="space-y-3">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <input value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="LinkedIn URL" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="GitHub URL" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={share} onChange={() => setShare(!share)} className="w-5 h-5 accent-green-500" />
              <span className={cn(body.className, "text-sm")}>Share identity with recruiters</span>
            </label>
            <button type="button" onClick={saveProfile} className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-sm")}>Save</button>
          </div>
        ) : (
          <div className={cn(body.className, "text-sm space-y-1 text-[#2c2c2c]/80")}>
            <p>Display: {user?.publicProfile?.displayName || "—"}</p>
            <p>LinkedIn: {user?.publicProfile?.linkedInUrl || "—"}</p>
            <p>GitHub: {user?.publicProfile?.githubUrl || "—"}</p>
            <p>Share with recruiters: {user?.publicProfile?.shareIdentityWithRecruiters ? "Yes" : "No"}</p>
          </div>
        )}
      </ComicCard>

      {/* Resumes */}
      <div>
        <h2 className={cn(display.className, "text-2xl mb-3")}>Your Resumes</h2>
        {resumes.length === 0 ? (
          <ComicCard variant="peach" shadow="small" className="text-center py-8">
            <p className={cn(body.className, "text-sm text-[#2c2c2c]/70")}>
              You haven&apos;t uploaded anything yet. Try uploading one!
            </p>
          </ComicCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => (
              <ResumeCard key={r._id} id={r._id} version={r.version} status={r.status} overall={r.aiScore?.overall} createdAt={r.createdAt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
