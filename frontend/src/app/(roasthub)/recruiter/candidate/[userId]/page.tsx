"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import { recruiterApi, type RecruiterCandidateProfile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Briefcase, ExternalLink, FileText, Sparkles, Trophy, UserRound } from "lucide-react";
import FlameIcon from "@/components/icons/flame-icon";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function RecruiterCandidateProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<RecruiterCandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId || authLoading) return;
    if (user?.role !== "recruiter") {
      setLoading(false);
      setError("Recruiter access only.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await recruiterApi.candidateProfile(userId);
      setData(res.data || null);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [userId, user?.role, authLoading]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || (loading && !error && user?.role === "recruiter")) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Skeleton className="h-12 w-64 border-[3px] border-border rounded-none" />
        <Skeleton className="h-40 w-full border-[3px] border-border rounded-none" />
        <Skeleton className="h-64 w-full border-[3px] border-border rounded-none" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 text-center bg-card">
          <CardTitle className="font-heading text-2xl mb-4 tracking-tighter ">Sign in</CardTitle>
          <p className="text-muted-foreground text-sm mb-6">Recruiters must sign in to view candidate portfolios.</p>
          <Link href="/login">
            <Button className="w-full border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 rounded-none font-heading">
              Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (user.role !== "recruiter" || error) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <Card className="border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 bg-card">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-heading text-2xl  mb-2">Unavailable</h1>
          <p className="text-muted-foreground text-sm mb-6">{error || "This page is for recruiter accounts only."}</p>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="border-[3px] border-border rounded-none font-heading shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
          >
            Hall of Shame
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <Card className="border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 bg-card">
          <UserRound className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-heading text-2xl mb-2">Profile not found</h1>
          <p className="text-muted-foreground text-sm mb-6">This candidate profile is unavailable or no longer exists.</p>
          <Button
            variant="outline"
            onClick={() => router.push("/recruiter")}
            className="border-[3px] border-border rounded-none font-heading shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
          >
            Back to candidates
          </Button>
        </Card>
      </div>
    );
  }

  const alias = data.anonymousUsername || "Anonymous";
  const display = data.identity?.displayName;
  const initial = alias.charAt(0).toUpperCase();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-10">
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="w-fit border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 rounded-none font-heading text-xs h-9"
        >
          <ArrowLeft className="w-3 h-3 mr-2" /> Back
        </Button>

        <Card className="border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-card">
          <CardHeader className="border-b-[3px] border-border bg-muted/50 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div
                className={cn(
                  "size-20 shrink-0 rounded-full border-[3px] border-border flex items-center justify-center text-3xl font-heading shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  data.avatar ? "bg-muted overflow-hidden p-0" : "bg-primary/25",
                )}
              >
                {data.avatar ? (
                  <img src={data.avatar} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <UserRound className="w-5 h-5 text-primary shrink-0" />
                  <h1 className="font-heading text-3xl md:text-4xl uppercase tracking-tighter  text-foreground leading-tight">
                    {display || `u/${alias}`}
                  </h1>
                </div>
                <p className="font-mono text-sm text-muted-foreground tracking-tight">u/{alias}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    variant="outline"
                    className="border-2 border-border rounded-none text-[10px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Trophy className="w-3 h-3 mr-1" /> Talent {data.talentComposite ?? 0}
                  </Badge>
                  {data.targetRole && (
                    <Badge
                      variant="secondary"
                      className="border-2 border-border rounded-none text-[10px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Briefcase className="w-3 h-3 mr-1" /> {data.targetRole}
                    </Badge>
                  )}
                  {!data.identity && (
                    <Badge
                      variant="secondary"
                      className="border-2 border-border rounded-none text-[10px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Identity not shared
                    </Badge>
                  )}
                </div>
                {data.skills && data.skills.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.skills.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="border-2 border-border rounded-none text-[10px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] px-2 py-0.5"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {data.identity && (data.identity.linkedInUrl || data.identity.githubUrl) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {data.identity.linkedInUrl ? (
                      <a
                        href={data.identity.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 border-[3px] border-border bg-card text-sm font-heading tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all",
                        )}
                      >
                        <FaLinkedin className="w-4 h-4" /> LinkedIn
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    ) : null}
                    {data.identity.githubUrl ? (
                      <a
                        href={data.identity.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 border-[3px] border-border bg-card text-sm font-heading tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all",
                        )}
                      >
                        <FaGithub className="w-4 h-4" /> GitHub
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <section className="flex min-h-0 flex-col space-y-4">
        <div className="flex items-center gap-2 border-b-[3px] border-border pb-3">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="font-heading text-2xl tracking-tighter ">Resumes on RoastForge</h2>
        </div>
        <div
          className="min-h-0 max-h-[min(40rem,calc(100vh-14rem))] overflow-y-auto overscroll-y-contain rounded-none border-[3px] border-border bg-muted/20 p-4 sm:p-6 [scrollbar-gutter:stable]"
          aria-label="Candidate resumes"
        >
          {data.resumes.length === 0 ? (
            <p className="text-sm text-muted-foreground font-medium border-[3px] border-dashed border-border p-8 text-center bg-muted/30">
              No public resumes yet.
            </p>
          ) : (
            <motion.ul
              className="grid gap-4 sm:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {data.resumes.map((r) => (
                <motion.li key={r._id} variants={itemVariants}>
                  <Link href={`/resume/${r._id}`} className="block h-full group">
                    <Card className="h-full border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none group-hover:translate-x-1 group-hover:translate-y-1 transition-all bg-card">
                      <CardHeader className="pb-2 border-b-[3px] border-border bg-muted/40">
                        <CardTitle className="font-heading text-base leading-tight line-clamp-2">
                          {r.title || "Untitled"}
                        </CardTitle>
                        {r.aiScoreOverall != null && (
                          <Badge className="w-fit mt-2 border-2 border-border rounded-none text-[10px] font-heading shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            AI {r.aiScoreOverall}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="pt-4">
                        {r.blurb ? (
                          <CardDescription className="text-sm line-clamp-3 font-medium">{r.blurb}</CardDescription>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mt-3">
                          {r.commentsCount} comments · {r.likesCount} likes ·{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                      <CardFooter className="border-t-[3px] border-border bg-muted/30 pt-3">
                        <span className="font-heading text-xs tracking-wide text-primary">Open thread →</span>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col space-y-4">
        <div className="flex items-center gap-2 border-b-[3px] border-border pb-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="font-heading text-2xl tracking-tighter ">Projects</h2>
        </div>
        <div
          className="min-h-0 max-h-[min(40rem,calc(100vh-14rem))] overflow-y-auto overscroll-y-contain rounded-none border-[3px] border-border bg-muted/20 p-4 sm:p-6 [scrollbar-gutter:stable]"
          aria-label="Candidate projects"
        >
          {data.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground font-medium border-[3px] border-dashed border-border p-8 text-center bg-muted/30">
              No projects listed.
            </p>
          ) : (
            <motion.div
              className="grid gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {data.projects.map((project) => (
                <motion.div key={project._id} variants={itemVariants}>
                  <Card className="border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
                    <CardHeader className="border-b-[3px] border-border flex flex-row flex-wrap items-start justify-between gap-3 bg-muted/30 p-5">
                      <div className="min-w-0">
                        <CardTitle className="font-heading text-lg tracking-wide leading-tight">
                          {project.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-2 border-2 border-border rounded-none text-[10px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
                            project.aiStatus === "done"
                              ? "bg-green-300 text-foreground"
                              : project.aiStatus === "failed"
                                ? "bg-red-300 text-foreground"
                                : "bg-primary/20",
                          )}
                        >
                          {project.aiStatus || "—"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <p className="text-sm text-foreground/90 leading-relaxed font-medium">{project.description}</p>
                      {project.techStack?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {project.techStack.map((tech) => (
                            <span
                              key={tech}
                              className="text-[10px] font-heading tracking-wider px-2 py-1 border-2 border-border bg-muted shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      {project.aiEvaluation?.summary && (
                        <div className="border-[3px] border-border border-dashed bg-muted/40 p-4 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                            <FlameIcon size={12} strokeWidth={2} /> AI note
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{project.aiEvaluation.summary}</p>
                        </div>
                      )}
                      {(project.githubUrl || project.liveDemo) && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          {project.githubUrl && (
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <Button
                                variant="outline"
                                className="w-full border-[3px] border-border rounded-none font-heading text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                              >
                                <FaGithub className="w-4 h-4 mr-2" /> Repo
                              </Button>
                            </a>
                          )}
                          {project.liveDemo && (
                            <a href={project.liveDemo} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button className="w-full border-[3px] border-border rounded-none font-heading text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5">
                                <ExternalLink className="w-4 h-4 mr-2" /> Live demo
                              </Button>
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
