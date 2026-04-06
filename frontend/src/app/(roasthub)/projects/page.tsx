"use client";

import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch, getToken } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
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
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function ProjectsPage() {
  const token = typeof window !== "undefined" ? getToken() : null;
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

  if (!token) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="text-center max-w-md w-full border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardContent className="pt-6">
            <h1 className="text-3xl font-heading mb-2">Sign In Required</h1>
            <p className="text-sm text-muted-foreground mb-4">Sign in to add and manage projects.</p>
            <Link href="/login">
              <Button className="border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none font-heading text-lg">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-heading uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">Projects</h1>
          <p className="text-muted-foreground mt-1">Showcase what you've built beyond your resume.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading uppercase"><Plus className="w-4 h-4 mr-2" />Add Project</Button>} />
          <DialogContent className="border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading uppercase text-xl">New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="font-bold uppercase text-xs tracking-wider">Project Name</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="My awesome project" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
              </div>
              <div className="space-y-2">
                <label className="font-bold uppercase text-xs tracking-wider">Description</label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} required placeholder="What does it do?" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
              </div>
              <div className="space-y-2">
                <label className="font-bold uppercase text-xs tracking-wider">Tech Stack</label>
                <Input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="React, Node.js (comma separated)" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
              </div>
              <div className="space-y-2">
                <label className="font-bold uppercase text-xs tracking-wider">GitHub URL</label>
                <Input value={gh} onChange={(e) => setGh(e.target.value)} placeholder="https://github.com/..." className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
              </div>
              <div className="space-y-2">
                <label className="font-bold uppercase text-xs tracking-wider">Live Demo URL</label>
                <Input value={demo} onChange={(e) => setDemo(e.target.value)} placeholder="https://myproject.com" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 border-4 border-border rounded-none font-heading uppercase">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading uppercase">
                  {saving ? "Adding..." : "Add Project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {[...Array(4)].map((_, i) => (
             <Skeleton key={i} className="h-56 w-full border-4 border-border" />
           ))}
        </div>
      ) : list.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="p-16 text-center">
              <Code className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-heading text-xl uppercase mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-sm">Add your projects to strengthen your profile.</p>
              <Button onClick={() => setOpen(true)} className="mt-6 border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-heading uppercase">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Project
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
          <AnimatePresence>
            {list.map((project: Project) => (
              <motion.div key={project._id} variants={itemVariants} exit="exit" layout whileHover={{ y: -4, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }}>
                <Card className="h-full flex flex-col border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-card">
                  <CardHeader className="border-b-4 border-border bg-muted px-5 py-4">
                    <div className="flex items-start justify-between gap-2">
                       <h3 className="font-heading text-lg uppercase leading-tight">{project.title}</h3>
                       <div className="flex items-center gap-2">
                          <span className={cn("rounded-none border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase", project.aiStatus === "READY" ? "bg-green-300" : project.aiStatus === "FAILED" ? "bg-red-300" : "bg-primary")}>
                            {project.aiStatus || "—"}
                          </span>
                          <Button variant="ghost" size="icon" className="w-8 h-8 border-2 border-border rounded-none hover:bg-destructive hover:text-destructive-foreground flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" onClick={() => handleDelete(project._id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-5 space-y-4">
                     <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
                     {project.techStack?.length > 0 && (
                       <div className="flex flex-wrap gap-2">
                         {project.techStack.map((tech: string, i: number) => (
                           <Badge key={i} variant="secondary" className="border-2 border-border rounded-none text-xs font-mono">
                             {tech}
                           </Badge>
                         ))}
                       </div>
                     )}
                     {project.aiEvaluation?.summary && (
                       <div className="border-2 border-dashed border-border bg-primary/5 p-3">
                         <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                           <Sparkles className="w-3 h-3" />
                           AI Evaluation
                         </div>
                         <p className="text-xs text-muted-foreground leading-relaxed">{project.aiEvaluation.summary}</p>
                       </div>
                     )}
                  </CardContent>
                  {(project.githubUrl || project.liveDemo) && (
                    <CardFooter className="border-t-4 border-border px-5 py-3 gap-3">
                      {project.githubUrl && (
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-heading uppercase">
                            <FaGithub className="w-3 h-3 mr-1.5" /> GitHub
                          </Button>
                        </a>
                      )}
                      {project.liveDemo && (
                        <a href={project.liveDemo} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs font-heading uppercase">
                            <ExternalLink className="w-3 h-3 mr-1.5" /> Live Demo
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
  );
}
