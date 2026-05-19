"use client";

import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Code, Sparkles } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardFooter, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
} as const;

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [stack, setStack] = useState("");
  const [gh, setGh] = useState("");
  const [demo, setDemo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Project[]>("/api/project");
      setList(res.data || []);
    } catch { /* not logged in */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role === "recruiter") {
      router.replace("/recruiter");
    }
  }, [authLoading, user?.role, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-4 py-16 min-h-[40vh]">
        <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[var(--shadow-md)] bg-card p-8">
          <CardTitle className="font-heading text-center text-xl tracking-wide text-muted-foreground animate-pulse">Loading…</CardTitle>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full border-2 border-border rounded-none animate-pulse" />
            <Skeleton className="h-10 w-full border-2 border-border rounded-none animate-pulse" />
          </div>
        </Card>
      </div>
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/project", {
        method: "POST",
        body: JSON.stringify({ title, description: desc, techStack: stack.split(",").map((s) => s.trim()).filter(Boolean), githubUrl: gh || undefined, liveDemo: demo || undefined }),
      });
      toast.success("Project created — AI job queued!");
      setTitle(""); setDesc(""); setStack(""); setGh(""); setDemo("");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/project/${id}`, { method: "DELETE" });
      toast.success("Project removed.");
      load();
    } catch (err) {
      toast.error("Failed to delete project");
    }
  }

  if (user?.role === "recruiter") {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[var(--shadow-md)] bg-card text-center p-8">
          <CardTitle className="font-heading text-xl tracking-wide">Redirecting…</CardTitle>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[var(--shadow-md)] text-center p-8 bg-card">
          <h1 className="font-heading text-3xl mb-4 tracking-tighter text-foreground">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to add and manage your projects.</p>
          <Link href="/login">
            <Button className="border-[3px] border-border shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading tracking-wide px-8 h-12 cursor-pointer">
              Sign In Now
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="container mx-auto px-4 py-8 md:py-12 max-w-4xl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading tracking-tighter text-foreground mb-2">Projects</h1>
          <p className="text-muted-foreground text-lg tracking-tight">Showcase what you've built beyond your resume.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="border-[3px] border-border rounded-none shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-heading tracking-wide w-full sm:w-auto h-11 px-6 cursor-pointer"><Plus className="w-4 h-4 mr-2" /> Add Project</Button>} />
          <DialogContent className="border-[3px] border-border rounded-none shadow-[var(--shadow-lg)] max-w-md p-6 bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl tracking-wide">New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Project Name</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="My awesome project" className="border-[3px] border-border rounded-none bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)] h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Description</label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} required placeholder="What does it do?" className="border-[3px] border-border rounded-none bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)] h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Tech Stack</label>
                <Input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="React, Node.js (comma separated)" className="border-[3px] border-border rounded-none bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)] h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">GitHub URL</label>
                <Input value={gh} onChange={(e) => setGh(e.target.value)} placeholder="https://github.com/..." className="border-[3px] border-border rounded-none bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)] h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Live Demo URL</label>
                <Input value={demo} onChange={(e) => setDemo(e.target.value)} placeholder="https://myproject.com" className="border-[3px] border-border rounded-none bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all focus:shadow-[var(--shadow-2xs)] h-10" />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 border-[3px] border-border rounded-none font-heading tracking-wide h-10 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 border-[3px] border-border rounded-none shadow-[var(--shadow-xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-heading tracking-wide h-10 cursor-pointer">
                  {saving ? "Adding..." : "Add Project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div
        className="min-h-0 max-h-[min(40rem,calc(100vh-12rem))] overflow-y-auto overscroll-y-contain rounded-none border-[3px] border-border bg-muted/20 p-4 sm:p-6 [scrollbar-gutter:stable]"
        aria-label="Your projects"
      >
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full border-[3px] border-border rounded-none" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-[3px] border-border border-dashed bg-muted/30 rounded-none text-center p-12 flex flex-col items-center justify-center shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0 transition-colors">
              <Code className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-heading text-xl tracking-wide mb-1">No projects yet</h3>
              <p className="text-muted-foreground text-sm mb-6">Add your projects to strengthen your profile.</p>
              <Button onClick={() => setOpen(true)} className="border-[3px] border-border rounded-none shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-heading tracking-wide h-11 px-6 cursor-pointer">
                <Plus className="w-4 h-4 mr-2" /> Add Your First Project
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
            <AnimatePresence>
              {list.map((project: Project) => (
                <motion.div key={project._id} variants={itemVariants} exit="exit" layout className="h-full">
                  <Card className="h-full flex flex-col border-[3px] border-border rounded-none shadow-[var(--shadow-sm)] bg-card">
                    <CardHeader className="border-b-[3px] border-border bg-muted/40 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-heading text-lg leading-tight tracking-wide">{project.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("rounded-none border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase shadow-[var(--shadow-2xs)]", project.aiStatus === "READY" ? "bg-emerald-300 text-emerald-950" : project.aiStatus === "FAILED" ? "bg-rose-300 text-rose-950" : "bg-primary text-primary-foreground")}>
                            {project.aiStatus || "—"}
                          </span>
                          <Button variant="ghost" size="icon" className="w-7 h-7 border-2 border-border rounded-none text-foreground hover:text-destructive-foreground hover:bg-destructive hover:no-underline shadow-[var(--shadow-2xs)] transition-all p-0 cursor-pointer" onClick={() => handleDelete(project._id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-5 space-y-4">
                      <p className="text-sm text-foreground/80 leading-relaxed font-medium">{project.description}</p>
                      {project.techStack?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {project.techStack.map((tech: string, i: number) => (
                            <Badge key={i} variant="secondary" className="border-2 border-border rounded-none text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 shadow-[var(--shadow-2xs)] bg-card">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {project.aiEvaluation?.summary && (
                        <div className="border-[3px] border-dashed border-border bg-muted/20 p-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                            AI Evaluation
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{project.aiEvaluation.summary}</p>
                        </div>
                      )}
                    </CardContent>
                    {(project.githubUrl || project.liveDemo) && (
                      <CardFooter className="border-t-[3px] border-border px-5 py-4 gap-3 bg-muted/20 mt-auto">
                        {project.githubUrl && (
                          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="outline" size="sm" className="w-full border-[3px] border-border rounded-none shadow-[var(--shadow-xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-heading h-9 cursor-pointer">
                              <FaGithub className="w-4 h-4 mr-2" /> Repo
                            </Button>
                          </a>
                        )}
                        {project.liveDemo && (
                          <a href={project.liveDemo} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button size="sm" className="w-full border-[3px] border-border rounded-none shadow-[var(--shadow-xs)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-heading h-9 cursor-pointer">
                              <ExternalLink className="w-4 h-4 mr-2" /> Live
                            </Button>
                          </a>
                        )}
                      </CardFooter>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
