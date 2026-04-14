"use client";

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { resumeApi, type Resume, type ResumeListResult, RESUME_GALLERY_PAGE_SIZE } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Search, ChevronLeft, ChevronRight, Clock, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/store/auth";

type SortTab = "new" | "hot" | "top";

function HallPagination({
  page,
  pages,
  pageRange,
  setPage,
  className,
}: {
  page: number;
  pages: number;
  pageRange: () => (number | "...")[];
  setPage: Dispatch<SetStateAction<number>>;
  className?: string;
}) {
  return (
    <nav className={cn("flex items-center justify-center gap-2 flex-wrap", className)} aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="border-[3px] border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all h-9 px-3"
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
            onClick={() => setPage(item as number)}
            className={cn(
              "w-9 h-9 border-[3px] border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-heading",
              page === item
                ? "translate-x-0.5 translate-y-0.5 shadow-none bg-primary text-primary-foreground"
                : "hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5",
            )}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => setPage((p) => Math.min(pages, p + 1))}
        className="border-[3px] border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all h-9 px-3"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </nav>
  );
}

export default function HomePage() {
  const { user } = useAuth();
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
      const raw = res.data as ResumeListResult | Resume[] | undefined;
      let list: Resume[] = [];
      let totalCount = 0;
      let pageCount = 1;

      if (Array.isArray(raw)) {
        list = raw;
        totalCount = raw.length;
        pageCount = 1;
      } else if (raw && typeof raw === "object" && Array.isArray(raw.resumes)) {
        list = raw.resumes;
        totalCount = Number(raw.total);
        if (!Number.isFinite(totalCount) || totalCount < 0) totalCount = list.length;
        const apiPages = Number(raw.pages);
        pageCount =
          Number.isFinite(apiPages) && apiPages > 0
            ? Math.floor(apiPages)
            : Math.max(1, Math.ceil(totalCount / RESUME_GALLERY_PAGE_SIZE));
      }

      setResumes(list);
      setTotal(totalCount);
      setPages(pageCount);
    } catch {
      setResumes([]);
      setTotal(0);
      setPages(1);
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
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8">
      {/* Hero Section */}
      <section className="py-20 text-center space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-4 bg-primary text-primary-foreground rounded-full mb-4 border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <Flame className="w-12 h-12" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-heading normal-case text-foreground tracking-tighter leading-[0.9] font-black"
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
          {user?.role === "recruiter"
            ? "Browse the Hall of Shame below or open your dashboard to filter and discover candidates."
            : "Upload your resume. Get it completely torn apart by AI and brutally honest peers. Fix it before recruiters toss it in the bin."}
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-4"
        >
          {user?.role === "recruiter" ? (
            <Link href="/recruiter" data-testid="link-hero-recruiter">
              <Button size="lg" className="text-lg px-8 border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase tracking-wide h-14">
                Recruiter dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/upload" data-testid="link-hero-upload">
              <Button size="lg" className="text-lg px-8 border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase tracking-wide h-14">
                Roast My Resume
              </Button>
            </Link>
          )}
        </motion.div>
      </section>

      {/* Gallery Section */}
      <section className="py-12">
        {/* Header: title + sort + search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-tighter font-black mb-2 text-foreground">
              Hall of Shame
            </h1>
            <p className="text-muted-foreground text-lg tracking-tight">The most roasted resumes on the internet. Proceed with caution.</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by title or description..." 
                className="pl-9 border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none h-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Button type="submit" variant="secondary" className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-10" data-testid="button-search">Search</Button>
          </form>
        </div>

        {/* Sort tabs + active search indicator */}
        <div className="flex items-center gap-2 mb-6 border-b-[3px] border-border pb-3 overflow-x-auto overflow-y-hidden">
          {[
            { id: "new", label: "Newest", icon: Clock },
            { id: "hot", label: "Hot", icon: Flame },
            { id: "top", label: "Top", icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
              setSort(tab.id as SortTab);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 font-heading uppercase text-sm border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all whitespace-nowrap active:scale-95",
                sort === tab.id 
                  ? "bg-primary text-primary-foreground translate-x-0.5 translate-y-0.5 shadow-none" 
                  : "bg-card hover:bg-muted hover:-translate-y-0.5"
              )}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {search && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground font-medium ml-2">
            Results for &ldquo;<span className="font-bold text-foreground">{search}</span>&rdquo;
            <button onClick={clearSearch} className="underline hover:text-foreground transition-colors">Clear</button>
          </span>
        )}

        {/* Total + pagination (above grid so page controls stay visible) */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <p className="text-xs text-muted-foreground font-bold tabular-nums">
              {total} {total === 1 ? "resume" : "resumes"}
              {pages > 1 ? (
                <span className="text-muted-foreground/80 font-medium">
                  {" "}
                  · Page {page} of {pages}
                </span>
              ) : null}
            </p>
            {pages > 1 ? (
              <HallPagination page={page} pages={pages} pageRange={pageRange} setPage={setPage} className="sm:justify-end" />
            ) : null}
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
              {resumes.map((resume: Resume) => {
                const ownerId =
                  resume.userId && typeof resume.userId === "object" && "_id" in resume.userId
                    ? String((resume.userId as { _id: string })._id)
                    : "";
                return (
                  <motion.div
                    key={resume._id}
                    whileHover={{ y: -5, x: -5, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }}
                    className="h-full"
                  >
                    <Card className="h-80 flex flex-col border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-card overflow-hidden">
                      <Link
                        href={`/resume/${resume._id}`}
                        data-testid={`link-resume-${resume._id}`}
                        className="flex flex-1 flex-col min-h-0 text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CardHeader className="pb-0 p-5 shrink-0 border-b-[3px] border-border">
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-heading text-base line-clamp-2 leading-tight pr-1">
                                {resume.title || resume.userId?.anonymousUsername || "Untitled"}
                              </h3>
                              <p className="text-xs text-muted-foreground truncate mt-1 font-mono tracking-tight">
                                u/{resume.userId?.anonymousUsername || resume.userId?.name || "Anonymous"}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 px-5 pb-4 flex flex-col cursor-pointer">
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
                      </Link>
                      <CardFooter className="text-xs text-muted-foreground border-t-[3px] border-border p-3 bg-muted rounded-none shrink-0 mt-auto flex flex-wrap items-center justify-between gap-2">
                        <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          {user?.role === "recruiter" && ownerId ? (
                            <Link
                              href={`/recruiter/candidate/${ownerId}`}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`link-candidate-${ownerId}`}
                              className="font-heading uppercase text-[10px] tracking-wider px-2 py-1 border-[3px] border-border bg-card text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                            >
                              Portfolio
                            </Link>
                          ) : null}
                          <span className="font-heading uppercase text-[10px] tracking-wider">Open resume →</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}

              {resumes.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-lg text-muted-foreground">
                    {search ? "No resumes match your search." : "No resumes found. Be the first to get roasted."}
                  </p>
                </div>
              )}
            </div>

            {pages > 1 ? (
              <HallPagination page={page} pages={pages} pageRange={pageRange} setPage={setPage} className="mt-10" />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
