"use client";

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getCardBg, getDiceBearUrl } from "@/lib/avatar";
import { resumeApi, type Resume, type ResumeListResult, RESUME_GALLERY_PAGE_SIZE } from "@/lib/api";
import { enqueueResumeReaction, flushQueuedResumeReactions } from "@/lib/resume-reaction-sync";
import { ResumeReactionControls } from "@/components/resume-reaction-controls";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, X, SlidersHorizontal, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";

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
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactionPending, setReactionPending] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortTab>("new");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const inferReaction = useCallback((resume: Resume): "like" | "dislike" | null => {
    if (resume.viewerReaction === "like" || resume.viewerReaction === "dislike") return resume.viewerReaction;
    if (resume.isLiked) return "like";
    if (resume.isDisliked) return "dislike";
    return null;
  }, []);

  const applyReaction = useCallback(
    (resume: Resume, reaction: "like" | "dislike") => {
      const prev = inferReaction(resume);
      const next = prev === reaction ? null : reaction;
      const likesCount = Math.max(
        0,
        (resume.likesCount ?? 0) + (next === "like" ? 1 : 0) - (prev === "like" ? 1 : 0),
      );
      const dislikesCount = Math.max(
        0,
        (resume.dislikesCount ?? 0) + (next === "dislike" ? 1 : 0) - (prev === "dislike" ? 1 : 0),
      );
      return {
        ...resume,
        viewerReaction: next,
        isLiked: next === "like",
        isDisliked: next === "dislike",
        likesCount,
        dislikesCount,
      };
    },
    [inferReaction],
  );

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

  const reactOnCard = useCallback(
    async (resumeId: string, reaction: "like" | "dislike") => {
      if (!user) {
        toast.error("Please log in to react.");
        router.push("/login");
        return;
      }
      const current = resumes.find((r) => r._id === resumeId);
      if (!current) return;
      const ownerId = current.userId?._id;
      if (ownerId && ownerId === user.id) {
        toast.error("You cannot react to your own resume.");
        return;
      }

      const optimistic = applyReaction(current, reaction);
      const optimisticReaction = optimistic.viewerReaction;
      setReactionPending((prev) => ({ ...prev, [resumeId]: true }));
      setResumes((prev) => prev.map((r) => (r._id === resumeId ? optimistic : r)));

      try {
        const res = await resumeApi.react(resumeId, reaction);
        const data = res.data;
        if (data) {
          setResumes((prev) =>
            prev.map((r) =>
              r._id === resumeId
                ? {
                    ...r,
                    viewerReaction: data.viewerReaction,
                    isLiked: data.isLiked,
                    isDisliked: data.isDisliked,
                    likesCount: data.likesCount,
                    dislikesCount: data.dislikesCount,
                  }
                : r,
            ),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save reaction.";
        const networkish =
          typeof navigator !== "undefined"
          && (!navigator.onLine || /network|failed to fetch|load failed/i.test(message));
        if (networkish && optimisticReaction) {
          enqueueResumeReaction(resumeId, optimisticReaction);
          toast.error("Offline detected. Reaction queued and will sync when you're online.");
        } else {
          setResumes((prev) => prev.map((r) => (r._id === resumeId ? current : r)));
          toast.error(message);
        }
      } finally {
        setReactionPending((prev) => ({ ...prev, [resumeId]: false }));
      }
    },
    [applyReaction, resumes, router, user],
  );

  useEffect(() => {
    const flush = async () => {
      const synced = await flushQueuedResumeReactions();
      if (synced > 0) {
        await load();
        toast.success(`Synced ${synced} queued reaction${synced > 1 ? "s" : ""}.`);
      }
    };
    void flush();
    const onOnline = () => { void flush(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

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
    <div className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-5 lg:px-6">
      {/* Hero Section — Tokenizer style */}
      <section className="mx-auto mb-14 max-w-[1080px] space-y-7 border-[3px] border-border bg-accent/30 px-5 py-14 text-center sm:px-7 md:mb-18 md:space-y-8 md:px-10 md:py-20">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto max-w-3xl text-4xl font-heading font-bold leading-[0.95] tracking-tighter text-foreground md:text-6xl"
        >
          Find your resume&apos;s
          <br /> brutal truth
        </motion.h1>

        {/* Search bar — wide, Tokenizer-style */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto flex max-w-xl items-stretch gap-0 border-[3px] border-border bg-background"
        >
          <div className="flex items-center pl-4 pr-2 text-muted-foreground shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <Input
            placeholder="Search by name or use filters"
            className="flex-1 min-w-0 border-0 shadow-none rounded-none h-12 text-base focus-visible:ring-0 focus-visible:shadow-none bg-transparent"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid="input-search"
          />
          <button type="button" className="shrink-0 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors border-l-[3px] border-border">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          <Button
            type="submit"
            className="h-12 px-6 shrink-0 rounded-none border-0 border-l-[3px] border-border font-heading text-sm tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 hover:translate-x-0 hover:translate-y-0 !shadow-none"
            data-testid="button-search"
          >
            Find Resumes
          </Button>
        </motion.form>

        {/* Trending tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-3 text-sm flex-wrap"
        >
          <span className="text-muted-foreground font-medium">Trending:</span>
          {["software-eng", "product", "design"].map((tag) => (
            <button
              key={tag}
              onClick={() => { setSearchInput(tag); setSearch(tag); setPage(1); }}
              className="font-heading text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-2 decoration-border hover:decoration-primary"
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {user?.role === "recruiter" ? (
            <Link href="/recruiter" data-testid="link-hero-recruiter">
              <Button size="lg" className="text-base px-8 border-[3px] border-border !shadow-none hover:translate-x-0 hover:translate-y-0 transition-colors rounded-none font-heading tracking-wide h-12">
                Recruiter Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/upload" data-testid="link-hero-upload">
              <Button size="lg" className="text-base px-8 border-[3px] border-border !shadow-none hover:translate-x-0 hover:translate-y-0 transition-colors rounded-none font-heading tracking-wide h-12">
                Roast My Resume
              </Button>
            </Link>
          )}
        </motion.div>
      </section>

      {/* Gallery Section */}
      <section className="mx-auto w-full max-w-[1120px]">
        {/* Header row: title + sort + pagination */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tighter text-foreground">
                Hall of Shame
              </h2>
              {!loading && total > 0 && (
                <span className="text-xs text-muted-foreground font-bold tabular-nums border-2 border-border/50 px-2 py-0.5">
                  {total}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              The most roasted resumes on the internet. Proceed with caution.
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground font-medium mr-2 hidden sm:inline">Sort by:</span>
            {(
              [
                { id: "new", label: "newest" },
                { id: "hot", label: "hottest" },
                { id: "top", label: "top" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeSort(tab.id)}
                className={cn(
                  "px-3 py-1.5 font-heading text-sm transition-all",
                  sort === tab.id
                    ? "text-foreground underline underline-offset-4 decoration-2 decoration-primary font-bold"
                    : "text-muted-foreground hover:text-foreground hover:underline hover:decoration-2 hover:decoration-border hover:underline-offset-4"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active search badge */}
        {search && (
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-2 bg-card border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5 font-heading text-xs">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">{search}</span>
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="-mr-1 flex items-center justify-center w-5 h-5 border-2 border-border bg-background hover:bg-destructive hover:text-destructive-foreground transition-colors active:scale-90"
                data-testid="button-clear-search"
              >
                <X className="w-3 h-3" strokeWidth={3} />
              </button>
            </span>
          </div>
        )}

        {/* Cards grid — NFT style */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <Skeleton className="aspect-[5/4] w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {resumes.map((resume: Resume) => {
                const ownerId = resume.userId?._id;
                const username = resume.userId?.anonymousUsername || resume.userId?.name || "Anonymous";
                // Legacy fallback intentionally keys on the (immutable) resume id only
                // so the avatar stays visually stable even when the owner rerolls their
                // anonymous username. New resumes store avatarSeed explicitly.
                const avatarSeed = resume.avatarSeed || resume._id;
                const cardBg = getCardBg(avatarSeed);

                return (
                  <motion.div
                    key={resume._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full"
                  >
                    <Link
                      href={`/resume/${resume._id}`}
                      data-testid={`link-resume-${resume._id}`}
                      className="block h-full text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Card className="h-full flex flex-col border-[3px] border-border rounded-none shadow-[var(--shadow-sm)] bg-card overflow-hidden group hover:bg-muted/10 transition-colors duration-200">
                        {/* Avatar — landscape frame: shorter card, wider tiles (3-up on lg) */}
                        <div className={cn("relative aspect-[5/4] overflow-hidden border-b-[3px] border-border", cardBg)}>
                          <Image
                            src={getDiceBearUrl(avatarSeed, resume.avatarStyle ?? undefined, 176, {
                              backgroundColor: resume.avatarBackgroundColor ?? null,
                              flip: Boolean(resume.avatarFlip),
                              rotate: resume.avatarRotate ?? 0,
                              radius: resume.avatarRadius ?? 0,
                              scale: resume.avatarScale ?? 100,
                            })}
                            alt={`Avatar for ${username}`}
                            width={176}
                            height={176}
                            unoptimized
                            className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </div>

                        {/* Card info */}
                        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                          <h3 className="font-heading text-[13px] leading-snug line-clamp-2">
                            {resume.title || "Untitled Resume"}
                          </h3>

                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            u/{username}
                          </p>

                          {/* Stats row */}
                          <div className="mt-auto pt-1.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {resume.commentsCount ?? 0} {(resume.commentsCount ?? 0) === 1 ? "comment" : "comments"}
                            </span>
                            <span className="text-[10px] tabular-nums">
                              {new Date(resume.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t-[3px] border-border px-3 py-2 bg-muted/40 flex items-center justify-end gap-2">
                          {user?.role === "recruiter" && ownerId ? (
                            <span
                              onClick={(e) => e.stopPropagation()}
                              className="font-heading text-[10px] tracking-wider px-2 py-0.5 border-2 border-border bg-card shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
                            >
                              <Link href={`/recruiter/candidate/${ownerId}`} data-testid={`link-candidate-${ownerId}`}>
                                Portfolio
                              </Link>
                            </span>
                          ) : null}
                          <ResumeReactionControls
                            className="mr-auto"
                            likesCount={resume.likesCount ?? 0}
                            dislikesCount={resume.dislikesCount ?? 0}
                            viewerReaction={inferReaction(resume)}
                            pending={Boolean(reactionPending[resume._id])}
                            disabled={!user || (ownerId != null && ownerId === user.id)}
                            stopNavigation
                            onReact={(reaction) => void reactOnCard(resume._id, reaction)}
                          />
                          <span className="font-heading text-[10px] tracking-wider border-2 border-border px-2.5 py-0.5 bg-background hover:bg-primary hover:text-primary-foreground transition-colors">
                            View Roast
                          </span>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}

              {resumes.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <p className="text-lg text-muted-foreground font-medium">
                    {search ? "No resumes match your search." : "No resumes found. Be the first to get roasted."}
                  </p>
                </div>
              )}
            </div>

            {pages > 1 && (
              <HallPagination page={page} pages={pages} pageRange={pageRange} setPage={setPage} className="mt-10" />
            )}
          </>
        )}
      </section>
    </div>
  );
}
