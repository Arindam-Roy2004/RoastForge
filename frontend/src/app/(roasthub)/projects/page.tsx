"use client";

import { ComicCard } from "@/components/comic-card";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch, getToken } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FaFolderOpen, FaGithub, FaExternalLinkAlt } from "react-icons/fa";
import Link from "next/link";

type Project = {
  _id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveDemo?: string;
  aiStatus?: string;
  aiEvaluation?: { codeQuality: number; complexity: number; summary: string; extractedSkills?: string[] };
};

export default function ProjectsPage() {
  const token = getToken();
  const [list, setList] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [stack, setStack] = useState("");
  const [gh, setGh] = useState("");
  const [demo, setDemo] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Project[]>("/api/project");
      setList(res.data || []);
    } catch { /* not logged in */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/api/project", {
        method: "POST",
        body: JSON.stringify({ title, description: desc, techStack: stack.split(",").map((s) => s.trim()).filter(Boolean), githubUrl: gh || undefined, liveDemo: demo || undefined }),
      });
      toast.success("Project created — AI job queued!");
      setTitle(""); setDesc(""); setStack(""); setGh(""); setDemo("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center py-16">
        <ComicCard variant="yellow" shadow="large" className="text-center max-w-md">
          <h1 className={cn(display.className, "text-3xl mb-2")}>Sign In Required</h1>
          <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 mb-4")}>Sign in to add and manage projects.</p>
          <Link href="/login" className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-base")}>Sign In</Link>
        </ComicCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className={cn(display.className, "text-3xl")}>Projects</h1>
      <p className={cn(body.className, "text-sm text-[#2c2c2c]/70")}>
        Peerlist-style cards with async OpenAI evaluation and extracted skills.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add form */}
        <ComicCard variant="cream" shadow="medium">
          <p className={cn(display.className, "text-lg mb-3")}><FaFolderOpen className="inline mr-1" /> Add Project</p>
          <form onSubmit={create} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Title" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} required placeholder="Description" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="Tech stack (comma separated)" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <input value={gh} onChange={(e) => setGh(e.target.value)} placeholder="GitHub URL" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <input value={demo} onChange={(e) => setDemo(e.target.value)} placeholder="Live demo URL" className={cn(body.className, "w-full p-2 comic-border-2 rounded-lg bg-[#F8E4C6] focus:outline-none focus:bg-white")} />
            <button type="submit" className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-sm")}>Save &amp; Analyze</button>
          </form>
        </ComicCard>

        {/* List */}
        <div className="space-y-3">
          {list.length === 0 ? (
            <ComicCard variant="peach" shadow="small" className="text-center py-8">
              <p className={cn(body.className, "text-sm text-[#2c2c2c]/70")}>No projects yet.</p>
            </ComicCard>
          ) : list.map((p) => (
            <ComicCard key={p._id} variant="yellow" shadow="small">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className={cn(display.className, "text-base")}>{p.title}</p>
                <span className={cn(display.className, "rounded-full comic-border-2 px-2 py-0.5 text-[10px]", p.aiStatus === "READY" ? "bg-green-300" : p.aiStatus === "FAILED" ? "bg-red-300" : "bg-beige")}>
                  {p.aiStatus || "—"}
                </span>
              </div>
              <p className={cn(body.className, "text-sm text-[#2c2c2c]/80 mb-2")}>{p.description}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {p.techStack?.map((t) => (
                  <span key={t} className={cn(display.className, "rounded-full comic-border-2 bg-teal px-2 py-0.5 text-[10px]")}>{t}</span>
                ))}
              </div>
              {p.aiEvaluation?.summary && (
                <p className={cn(body.className, "text-xs text-[#2c2c2c]/60 italic mb-2")}>{p.aiEvaluation.summary}</p>
              )}
              <div className="flex gap-2">
                {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="comic-btn bg-beige comic-shadow-2 comic-lift text-xs"><FaGithub /> GitHub</a>}
                {p.liveDemo && <a href={p.liveDemo} target="_blank" rel="noreferrer" className="comic-btn bg-cream comic-shadow-2 comic-lift text-xs"><FaExternalLinkAlt /> Demo</a>}
              </div>
            </ComicCard>
          ))}
        </div>
      </div>
    </div>
  );
}
