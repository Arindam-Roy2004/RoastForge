"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { resumeApi, type Resume, type ResumeListResult } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type SortTab = "new" | "hot" | "top";

export default function HomePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortTab>("new");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await resumeApi.list({ page, sort, search: search || undefined });
      const d = res.data as ResumeListResult | undefined;
      setResumes(d?.resumes || []);
      setPages(d?.pages || 1);
      setTotal(d?.total || 0);
    } catch {
      setResumes([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const changeSort = (s: SortTab) => {
    if (s === sort) return;
    setSort(s);
    setPage(1);
  };

  // Build pagination range: always show first, last, and neighbors of current page
  function pageRange(): (number | "...")[] {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const items: (number | "...")[] = [];
    const near = new Set([1, 2, page - 1, page, page + 1, pages - 1, pages]);
    let prev = 0;
    for (const n of [...near].sort((a, b) => a - b)) {
      if (n < 1 || n > pages) continue;
      if (prev && n - prev > 1) items.push("...");
      items.push(n);
      prev = n;
    }
    return items;
  }

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
        {/* Header: title + sort + search */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-3xl font-heading uppercase">Hall of Shame</h2>
            <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by title or description..." 
                  className="pl-9 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Button type="submit" variant="secondary" className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none" data-testid="button-search">Search</Button>
            </form>
          </div>

          {/* Sort tabs + active search indicator */}
          <div className="flex flex-wrap items-center gap-3">
            {(["new", "hot", "top"] as const).map((s) => (
              <button
                key={s}
                onClick={() => changeSort(s)}
                className={cn(
                  "px-4 py-1.5 text-xs font-heading uppercase border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all",
                  sort === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {s === "new" ? "Newest" : s === "hot" ? "Hot" : "Top"}
              </button>
            ))}
            {search && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground font-medium ml-2">
                Results for &ldquo;<span className="font-bold text-foreground">{search}</span>&rdquo;
                <button onClick={clearSearch} className="underline hover:text-foreground transition-colors">Clear</button>
              </span>
            )}
            {!loading && (
              <span className="ml-auto text-xs text-muted-foreground font-bold tabular-nums">
                {total} {total === 1 ? "resume" : "resumes"}
              </span>
            )}
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {resumes.map((resume: Resume) => (
                <Link key={resume._id} href={`/resume/${resume._id}`} data-testid={`link-resume-${resume._id}`}>
                  <motion.div
                    whileHover={{ y: -5, x: -5, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }}
                    className="h-full"
                  >
                    <Card className="h-[320px] flex flex-col border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-card cursor-pointer overflow-hidden">
                      <CardHeader className="pb-0 p-5 shrink-0 border-b-2 border-border">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading text-base line-clamp-2 leading-tight pr-1">
                              {resume.title || resume.userId?.anonymousUsername || "Untitled"}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate mt-1">by {resume.userId?.anonymousUsername || resume.userId?.name}</p>
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
                              <span className="mx-1.5 text-border">&middot;</span>
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

              {resumes.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-lg text-muted-foreground">
                    {search ? "No resumes match your search." : "No resumes found. Be the first to get roasted."}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-10 flex-wrap" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-heading uppercase text-xs h-9 w-9 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {pageRange().map((item, idx) =>
                  item === "..." ? (
                    <span key={`dots-${idx}`} className="px-1 text-muted-foreground font-bold select-none">&hellip;</span>
                  ) : (
                    <Button
                      key={item}
                      variant={page === item ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(item)}
                      className={cn(
                        "border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-heading text-xs h-9 w-9 p-0",
                        page === item && "shadow-none translate-x-0.5 translate-y-0.5"
                      )}
                    >
                      {item}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-heading uppercase text-xs h-9 w-9 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
