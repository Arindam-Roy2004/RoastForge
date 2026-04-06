"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiFetch, type Resume } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Flame, ImageIcon, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ resumes: Resume[] }>("/api/resumes");
      setResumes(res.data?.resumes || []);
    } catch {
      /* not logged in or empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return resumes;
    const q = search.toLowerCase();
    return resumes.filter(
      (r) =>
        (r.userId?.anonymousUsername || r.userId?.name)?.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
    );
  }, [resumes, search]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="py-20 text-center space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-4 bg-primary text-primary-foreground rounded-full mb-4 border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <Flame className="w-12 h-12" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-heading uppercase text-foreground drop-shadow-[4px_4px_0px_#ef4444] tracking-tight leading-none"
        >
          Brutal Honesty.
          <br /> Better Resumes.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl max-w-3xl mx-auto text-muted-foreground font-medium"
        >
          Upload your resume. Get it completely torn apart by AI and brutally honest peers. Fix it before recruiters toss it in the bin.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-4"
        >
          <Link href="/upload" data-testid="link-hero-upload">
            <Button size="lg" className="text-lg px-8 border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading">
              Roast My Resume
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Gallery Section */}
      <section className="py-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-heading uppercase">Hall of Shame</h2>
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search candidates or skills..." 
                className="pl-9 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Button type="submit" variant="secondary" className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none" data-testid="button-search">Search</Button>
          </form>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((resume: Resume) => (
              <Link key={resume._id} href={`/resume/${resume._id}`} data-testid={`link-resume-${resume._id}`}>
                <motion.div
                  whileHover={{ y: -5, x: -5, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }}
                  className="h-full"
                >
                  <Card className="h-[320px] flex flex-col border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-card cursor-pointer overflow-hidden">
                    <CardHeader className="pb-0 p-5 shrink-0 border-b-2 border-border">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading text-base truncate pr-1">{resume.name || resume.userId?.anonymousUsername || "Anonymous"}</h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">by {resume.userId?.anonymousUsername || resume.userId?.name}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 px-5 pb-4 flex flex-col">
                      <div className="mt-2 flex-1 min-h-0 flex flex-col items-center justify-center gap-3 py-5 px-3 bg-muted border-2 border-border border-dashed">
                        <Flame className="w-10 h-10 text-destructive" />
                        <div className="text-center space-y-1">
                          <p className="font-heading text-sm uppercase tracking-wide text-foreground leading-tight">
                            Resume + roast thread
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium tabular-nums">
                            {resume.commentsCount ?? 0}{" "}
                            {(resume.commentsCount ?? 0) === 1 ? "comment" : "comments"}
                            <span className="mx-1.5 text-border">·</span>
                            {resume.likesCount ?? 0}{" "}
                            {(resume.likesCount ?? 0) === 1 ? "like" : "likes"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground border-t-4 border-border p-3 bg-muted rounded-none justify-between shrink-0 mt-auto">
                      <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
                      <span className="font-heading uppercase text-[10px] tracking-wider">Open</span>
                    </CardFooter>
                  </Card>
                </motion.div>
              </Link>
            ))}
            
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-lg text-muted-foreground">No resumes found. Be the first to get roasted.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
