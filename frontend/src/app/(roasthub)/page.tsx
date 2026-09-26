"use client";

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getDiceBearUrl, getPostCardBg } from "@/lib/avatar";
import { resumeApi, type Resume, type ResumeListResult, RESUME_GALLERY_PAGE_SIZE } from "@/lib/api";
import { enqueueResumeReaction, flushQueuedResumeReactions } from "@/lib/resume-reaction-sync";
import { ResumeReactionControls } from "@/components/resume-reaction-controls";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, X, SlidersHorizontal, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { HeroShowcase } from "@/components/hero-media";
import { useHashScroll } from "@/hooks/use-hash-scroll";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";

type SortTab = "new" | "hot" | "top";

/**
 * Shared shape for the small controls in a card footer ("View Roast",
 * "Portfolio") and the pagination buttons.
 *
 * `rounded-md` (6px) against the card's `rounded-lg` (8px), `text-xs
 * font-medium` in the body sans, and a hairline border — the shadcn small-button
 * idiom. Replaces the previous 10px display-face chips with wide tracking, which
 * read as labels rather than things you could press.
 */
const CARD_ACTION =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors";

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
    // Flat, quiet pagination in the shadcn idiom: uniform 36px squares, body
    // sans with `tabular-nums` so the digits don't jitter between pages, and
    // colour-only hover. Previously each button carried a shadow plus a
    // `-translate-y-0.5` lift, so a row of six of them shimmered on mouse-over.
    <nav className={cn("flex flex-wrap items-center justify-center gap-1.5", className)} aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="size-9 rounded-md border border-border px-0 !shadow-none transition-colors hover:translate-y-0 hover:bg-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </Button>
      {pageRange().map((item, idx) =>
        item === "..." ? (
          <span
            key={`dots-${idx}`}
            aria-hidden
            className="w-9 text-center text-sm text-muted-foreground select-none"
          >
            &hellip;
          </span>
        ) : (
          <Button
            key={item}
            variant={page === item ? "default" : "outline"}
            aria-label={`Page ${item}`}
            aria-current={page === item ? "page" : undefined}
            onClick={() => setPage(item as number)}
            className={cn(
              "size-9 rounded-md border border-border px-0 font-sans text-sm font-medium tabular-nums !shadow-none transition-colors hover:translate-y-0",
              page === item
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted hover:text-foreground",
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
        aria-label="Next page"
        onClick={() => setPage((p) => Math.min(pages, p + 1))}
        className="size-9 rounded-md border border-border px-0 !shadow-none transition-colors hover:translate-y-0 hover:bg-muted"
      >
        <ChevronRight aria-hidden className="size-4" />
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

  // The gallery is fetched client-side, so a `#hall-of-shame` link can't be left
  // to the browser's own hash handling — it resolves before the rows exist.
  useHashScroll(!loading);

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
    <div className="w-full">
      {/* Hero Section — artwork background, plays a muted loop on hover */}
      <HeroShowcase>
        <TextEffect
          as="h1"
          per="line"
          preset="fade-in-blur"
          speedReveal={1.1}
          className="mx-auto max-w-3xl text-4xl font-heading font-bold leading-[0.95] tracking-[-0.03em] text-foreground md:text-6xl"
        >
          {"Find your resume's\nbrutal truth"}
        </TextEffect>

        {/* Search bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto flex max-w-xl items-stretch gap-0 overflow-hidden rounded-lg border-2 border-border bg-background transition-colors focus-within:border-foreground/40"
        >
          <div className="flex items-center pl-4 pr-2 text-muted-foreground shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <Input
            placeholder="Search by name or use filters"
            className="flex-1 min-w-0 h-12 rounded-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 focus-visible:shadow-none"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid="input-search"
          />
          <button type="button" aria-label="Search filters" className="shrink-0 border-l-2 border-border px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          <Button
            type="submit"
            className="h-12 shrink-0 rounded-none border-0 border-l-2 border-border px-6 text-xs bg-primary text-primary-foreground hover:bg-primary/90 hover:translate-y-0 !shadow-none focus-visible:ring-0"
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
              className="font-heading text-muted-foreground hover:text-primary-strong transition-colors underline underline-offset-4 decoration-2 decoration-border hover:decoration-primary"
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
              <Button size="lg" className="text-base px-8 border border-border !shadow-none hover:translate-y-0 transition-colors rounded-lg font-heading tracking-wide h-12">
                Recruiter Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/upload" data-testid="link-hero-upload">
              <Button size="lg" className="text-base px-8 border border-border !shadow-none hover:translate-y-0 transition-colors rounded-lg font-heading tracking-wide h-12">
                Roast My Resume
              </Button>
            </Link>
          )}
        </motion.div>
      </HeroShowcase>

      {/* Gallery Section — the navbar's "Browse" link targets this anchor.
          scroll-mt clears the sticky h-16 navbar so the heading isn't hidden
          under it when jumped to. */}
      <section id="hall-of-shame" aria-labelledby="hall-of-shame-heading" className="w-full scroll-mt-24">
        {/* Header row: title + count + sort.
            Same orientation as before — titled block left, sort control right —
            but retuned so it reads as one system with the rest of the app:

            - The heading and its sub use the reference's section-header type
              scale rather than the display face: sans, `font-medium`,
              `tracking-tight`, stepping 2xl/3xl/4xl, with the sub a quiet
              `text-sm lg:text-base` beneath it. That template never sets a
              heading bold — the hierarchy comes from the size jump between the
              large heading and the small muted line under it, which is why the
              pairing reads as calm at any width.
            - The count is the shared <Badge>, which is what every other page
              uses for a count or label, rather than a one-off square chip.
            - Sort becomes a segmented control — the shadcn/Vercel pattern for
              picking one of a few options — instead of underlined text, which
              read as three links and gave no sense of a single active choice. */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              {/* `font-sans` is explicit because the base layer sets
                  `font-heading` on every h1–h6; this heading deliberately opts
                  out of the display face. */}
              <h2
                id="hall-of-shame-heading"
                className="font-sans text-2xl font-medium tracking-tight text-foreground md:text-3xl lg:text-4xl"
              >
                Hall of Shame
              </h2>
              {!loading && total > 0 && (
                <Badge variant="secondary" className="tabular-nums" data-testid="badge-resume-total">
                  {total}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium tracking-tight text-muted-foreground lg:text-base">
              The most roasted resumes on the internet. Proceed with caution.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden text-sm text-muted-foreground sm:inline">Sort by</span>
            {/* `role="group"` with `aria-pressed` buttons, matching how Radix and
                shadcn build a single-select ToggleGroup. Deliberately not a
                `tablist` — there are no tab panels here, only a re-sorted list —
                and not a `radiogroup`, which would promise arrow-key roving
                focus this control doesn't implement.

                Radii nest: 8px outer (`rounded-lg`) minus the 4px `p-1` gap
                gives the 4px inner pill (`rounded-sm`). */}
            <div
              role="group"
              aria-label="Sort resumes"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted p-1"
            >
              {(
                [
                  { id: "new", label: "Newest" },
                  { id: "hot", label: "Hottest" },
                  { id: "top", label: "Top" },
                ] as const
              ).map((tab) => {
                const selected = sort === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => changeSort(tab.id)}
                    aria-pressed={selected}
                    data-testid={`button-sort-${tab.id}`}
                    className={cn(
                      "cursor-pointer rounded-sm px-2.5 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
                      selected
                        ? "bg-background text-foreground shadow-[var(--shadow-2xs)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active search badge */}
        {search && (
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-2 bg-card border border-border shadow-[var(--shadow-xs)] px-3 py-1.5 font-heading text-xs">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">{search}</span>
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="-mr-1 flex items-center justify-center w-5 h-5 border border-border bg-background hover:bg-destructive hover:text-destructive-foreground transition-colors active:scale-90"
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
              <Card key={i} className="border border-border rounded-lg shadow-[var(--shadow-sm)] overflow-hidden">
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
                // One colour fills the whole avatar area. New posts store their
                // own; older ones fall back to a colour keyed on the post id (not
                // the seed, which is the owner's id), so every post differs even
                // when one person posted several.
                const cardBg = getPostCardBg(resume.avatarBackgroundColor, resume._id);

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
                      <Card className="h-full flex flex-col border border-border rounded-lg shadow-[var(--shadow-sm)] bg-card overflow-hidden group hover:bg-muted/10 transition-colors duration-200">
                        {/* Avatar — landscape frame: shorter card, wider tiles (3-up on lg) */}
                        <div className={cn("relative aspect-[5/4] overflow-hidden border-b border-border", cardBg)}>
                          <Image
                            src={getDiceBearUrl(avatarSeed, resume.avatarStyle ?? undefined, 176, {
                              // Transparent so the card colour shows through. A
                              // coloured avatar background drew a second square
                              // inside the card.
                              backgroundColor: "transparent",
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

                        {/* Card info.

                            Typography follows the section header: sans,
                            `font-medium`, `tracking-tight`, on the standard
                            text-sm / text-xs steps rather than the one-off
                            13px/11px/10px sizes this used before. Three
                            different bespoke sizes inside a 90px block is what
                            made the card feel unresolved.

                            The stats row's own `border-t` is gone. With the
                            footer's separator sitting ~30px below it, the card
                            had two horizontal rules stacked in a very short
                            space; `mt-auto` alone still pins the row to the
                            bottom, so the layout is unchanged. */}
                        <div className="flex flex-1 flex-col gap-1 p-3.5">
                          {/* `font-sans` is explicit: the base layer puts the
                              display face on every h1–h6. */}
                          <h3 className="line-clamp-2 font-sans text-sm leading-snug font-medium tracking-tight text-foreground">
                            {resume.title || "Untitled Resume"}
                          </h3>

                          {/* Post body preview. Posts without a body render
                              nothing, so older cards are unchanged; `mt-auto` on
                              the stats row keeps rows level either way. */}
                          {resume.blurb ? (
                            <p className="line-clamp-2 whitespace-pre-line break-words text-xs text-muted-foreground">
                              {resume.blurb}
                            </p>
                          ) : null}

                          <p className="truncate text-xs text-muted-foreground">
                            u/{username}
                          </p>

                          {/* Stats row */}
                          <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare aria-hidden className="size-3.5 shrink-0" />
                              {resume.commentsCount ?? 0} {(resume.commentsCount ?? 0) === 1 ? "comment" : "comments"}
                            </span>
                            <span className="tabular-nums">
                              {new Date(resume.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>

                        {/* Footer: reactions left, actions right.

                            Reactions now come first in the DOM as well as
                            visually — `mr-auto` only pushes what follows it, so
                            with Portfolio rendered first the two ended up
                            sharing the left edge. */}
                        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-3 py-2">
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

                          {/* A button, not a Link. The whole card is already an
                              <a>, and an anchor nested inside an anchor is
                              invalid HTML — browsers close the outer one early,
                              which broke both links unpredictably. Navigating
                              imperatively keeps one anchor per card. */}
                          {user?.role === "recruiter" && ownerId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/recruiter/candidate/${ownerId}`);
                              }}
                              data-testid={`link-candidate-${ownerId}`}
                              className={cn(CARD_ACTION, "cursor-pointer hover:bg-muted")}
                            >
                              Portfolio
                            </button>
                          ) : null}

                          {/* Not interactive itself — the card is the link — so
                              it highlights on `group-hover` from the card rather
                              than on its own hover, which never fired when you
                              were anywhere else on the card. */}
                          <span
                            className={cn(
                              CARD_ACTION,
                              "group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground",
                            )}
                          >
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
