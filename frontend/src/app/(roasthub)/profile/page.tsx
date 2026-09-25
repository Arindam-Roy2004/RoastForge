"use client";

import { apiFetch, authApi, type User as AuthUser } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResumeRow } from "@/components/resume-row";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

/**
 * Profile, laid out as an admin dashboard rather than a profile "page".
 *
 * The previous version led with a 10rem-tall identity hero, then put the
 * settings and the resumes into two tall cards of unequal weight, and set almost
 * every label in uppercase mono at 10–11px. Three problems came out of that: the
 * page's most important content (the resumes) started below the fold, the
 * read-only profile values were wrapped in bordered grey boxes that looked like
 * disabled inputs, and there was no scannable summary of the account anywhere.
 *
 * The shape now follows the shadcn admin-dashboard convention the references all
 * share:
 *
 *   header      identity + the one destructive-adjacent action (sign out)
 *   stat row    the numbers that were previously buried in badges
 *   two columns settings (narrow) beside content (wide)
 *   danger zone its own bordered card, not a floating button
 *
 * No new data is shown — the resume count, talent score and visibility flag were
 * all already on the page, just as inline badges inside the hero.
 */

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
} as const;

/** Shared card shell. One border weight and one radius for every card here. */
const CARD = "rounded-xl border border-border bg-card shadow-[var(--shadow-xs)]";

/** Card header with its own rule, so a card's title reads as a bar not a paragraph. */
const CARD_HEAD =
  "flex flex-row items-start justify-between gap-4 space-y-0 border-b border-border px-5 py-4";

/** Roughly two wrapped rows of chips in a one-third column. */
const SKILL_PREVIEW_LIMIT = 8;

/**
 * Metrics, inline in the page masthead — no cards at all.
 *
 * Three values of one word each do not justify three boxes, and they didn't
 * justify one boxed strip either: a full-width card gave each segment ~370px to
 * hold ~120px of content, so the "too big for what's in it" problem just moved
 * from three containers into one. Dashboards put figures this small in the
 * header rule beside the title (Vercel's project masthead does exactly this),
 * separated by hairlines rather than wrapped in chrome.
 *
 * It also fills the right side of the header, which went empty when the
 * duplicate sign-out button came out.
 *
 * `divide-x` is safe here because this is a flex row — `& > * + *` really does
 * mean "between items". In a grid it would also border the first cell of every
 * subsequent row.
 */
function HeaderMetrics({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex shrink-0 divide-x divide-border/60">
      {items.map(({ label, value }) => (
        <div key={label} className="px-5 first:pl-0 last:pr-0">
          <dt className="text-xs whitespace-nowrap text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-lg leading-none font-medium tracking-tight tabular-nums text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Read-only field: quiet label above the value in plain text.
 *
 * The values used to sit in `bg-muted/50 p-2.5 border` boxes, which made every
 * one of them look like a disabled input — the single biggest reason the page
 * read as unfinished. Labels carry the structure; the values are just text.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

/** Labelled form control with optional helper text. */
function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function profileRowFromAuth(u: AuthUser): User {
  return {
    _id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "user",
    anonymousPublicId: u.anonymousUsername,
  };
}

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
    targetRole?: string;
    skills?: string[];
  };
  talentMetrics?: { composite: number };
};

type Resume = {
  _id: string;
  title?: string;
  version: number;
  status: string;
  aiScore?: { overall: number };
  createdAt?: string;
  userId?: { anonymousUsername?: string };
  candidateAlias?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { user: authUser, loading: authLoading } = useRequireAuth();
  const [user, setUser] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [github, setGithub] = useState("");
  const [share, setShare] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  // Skills are edited as a comma-separated string for a single-field UX;
  // we normalize + dedupe to an array right before sending to the API.
  const [skillsInput, setSkillsInput] = useState("");
  // Delete-account dialog state. Typed-email confirmation replaces the legacy
  // password check now that accounts authenticate exclusively via Google.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Skills are capped at 25 by the save handler, and 25 badges in a one-third
  // column is five or six wrapped rows — enough to push the card taller than the
  // resume list beside it and bury everything under it. Show two rows' worth and
  // let the reader ask for the rest.
  const [showAllSkills, setShowAllSkills] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!authUser) return;
    setDetailLoading(true);
    try {
      const u = await apiFetch<User & { id?: string }>("/api/auth/me");
      const raw = u.data;
      const row: User = raw
        ? {
            ...raw,
            _id: raw._id ?? (raw as { id?: string }).id ?? authUser.id,
            name: raw.name ?? authUser.name,
            email: raw.email ?? authUser.email,
            anonymousPublicId: (raw as { anonymousUsername?: string }).anonymousUsername ?? raw.anonymousPublicId ?? authUser.anonymousUsername,
          }
        : profileRowFromAuth(authUser);
      setUser(row);
      if (row.publicProfile) {
        setDisplayName(row.publicProfile.displayName || "");
        setLinkedIn(row.publicProfile.linkedInUrl || "");
        setGithub(row.publicProfile.githubUrl || "");
        setShare(row.publicProfile.shareIdentityWithRecruiters || false);
        setTargetRole(row.publicProfile.targetRole || "");
        setSkillsInput((row.publicProfile.skills || []).join(", "));
      }
      if (authUser.role !== "recruiter") {
        const r = await apiFetch<Resume[]>("/api/resumes/my");
        setResumes(r.data || []);
      } else {
        setResumes([]);
      }
    } catch {
      setUser(profileRowFromAuth(authUser));
    } finally {
      setDetailLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setUser(null);
      setResumes([]);
      setDetailLoading(false);
      return;
    }
    setUser(profileRowFromAuth(authUser));
    void loadDetails();
  }, [authLoading, authUser, loadDetails]);

  const isRecruiter = authUser?.role === "recruiter";

  async function confirmDeleteAccount() {
    if (!authUser) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount(deleteConfirm.trim());
      // Server already cleared the refresh cookie; clear our local token + user
      // state by routing through the same logout path the Sign Out button uses.
      await logout();
      toast.success("Account deleted");
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  }

  async function saveProfile() {
    try {
      // Recruiters don't own candidate search fields; only send what applies to them.
      // The backend enforces this too, but filtering here keeps payloads clean.
      const body: Record<string, unknown> = {
        displayName,
        linkedInUrl: linkedIn,
        githubUrl: github,
      };
      if (!isRecruiter) {
        // Split commas → trim → dedupe. Server normalizes again (lowercase/cap) as defense in depth.
        const parsedSkills = Array.from(
          new Set(
            skillsInput
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ).slice(0, 25);
        body.shareIdentityWithRecruiters = share;
        body.targetRole = targetRole;
        body.skills = parsedSkills;
      }
      await apiFetch("/api/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast.success("Profile updated!");
      setEditMode(false);
      void loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (authLoading) {
    return (
      // Mirrors the loaded layout exactly — header, one summary strip, then the
      // 1/3 + 2/3 columns. A skeleton in a different shape from what replaces it
      // reads as a layout jump rather than as loading.
      <div className="flex w-full flex-col gap-6 py-8">
        <Skeleton className="h-14 w-full rounded-xl border border-border" />
        <Skeleton className="h-16 w-full rounded-xl border border-border" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-xl border border-border" />
          <Skeleton className="h-80 w-full rounded-xl border border-border lg:col-span-2" />
        </div>
      </div>
    );
  }

  // Signed-out visitors are redirected to /login by useRequireAuth; render a
  // quiet placeholder for the frame before that navigation commits.
  if (!authUser) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  const displayUser = user ?? profileRowFromAuth(authUser);
  const profile = displayUser.publicProfile;
  const shared = Boolean(profile?.shareIdentityWithRecruiters);

  const skills = profile?.skills ?? [];
  const skillCount = skills.length;
  const visibleSkills = showAllSkills ? skills : skills.slice(0, SKILL_PREVIEW_LIMIT);
  const hiddenSkillCount = skillCount - visibleSkills.length;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="flex w-full min-w-0 flex-col gap-6 py-8"
    >
      {/* Masthead: identity left, metrics right, closed by a rule. The rule is
          what makes this read as a page header rather than as content that
          happens to be at the top. */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-lg font-medium text-foreground">
            {displayUser.name.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-sans text-2xl font-semibold tracking-tight text-foreground">
              {displayUser.name}
            </h1>
            {/* Email and alias share one muted line — they were three stacked
                blocks competing with the name before. */}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              <span className="break-all">{displayUser.email}</span>
              {displayUser.anonymousPublicId && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-mono text-xs">u/{displayUser.anonymousPublicId}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* No sign-out button here. The navbar carries Logout on every page,
            including this one, so a second control for the same action sat 60px
            below the first.

            Metrics are candidate-only: a recruiter has no resumes and no talent
            score, so they get the role badge instead. */}
        {isRecruiter ? (
          <Badge variant="secondary" className="w-fit shrink-0">
            Recruiter
          </Badge>
        ) : (
          <HeaderMetrics
            items={[
              { label: "Resumes", value: resumes.length },
              {
                label: "Talent score",
                value: displayUser.talentMetrics
                  ? Number(displayUser.talentMetrics.composite).toFixed(2)
                  : "—",
              },
              { label: "Visibility", value: shared ? "Shared" : "Anonymous" },
            ]}
          />
        )}
      </motion.div>

      {/* Settings beside content, narrow next to wide.

          No `items-start` — grid items stretch by default, and with `h-full` on
          both cards the two columns end on exactly the same line whichever one
          happens to be taller. `items-start` was letting each card size to its
          own content, which is what left one column short of the other. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className={cn(CARD, "h-full")}>
            <CardHeader className={CARD_HEAD}>
              <div className="space-y-1">
                <CardTitle className="font-sans text-base font-semibold tracking-tight">
                  Public profile
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRecruiter ? "Shown on your account." : "What recruiters can see."}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="shrink-0 cursor-pointer rounded-lg !shadow-none hover:translate-y-0"
              >
                {editMode ? "Cancel" : (<><Pencil className="size-3.5" /> Edit</>)}
              </Button>
            </CardHeader>

            <CardContent className="p-5">
              {editMode ? (
                <div className="space-y-5">
                  <FormField label="Display name">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                    />
                  </FormField>
                  <FormField label="LinkedIn URL">
                    <Input
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/…"
                    />
                  </FormField>
                  <FormField label="GitHub URL">
                    <Input
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="https://github.com/…"
                    />
                  </FormField>

                  {/* Target Role, Skills, and share-identity are candidate-only —
                      they power the recruiter search. Recruiters don't appear in that
                      search so these fields would just be noise on their profile. */}
                  {!isRecruiter && (
                    <>
                      <FormField label="Target role">
                        <Input
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          placeholder="e.g. Backend Engineer"
                          maxLength={80}
                        />
                      </FormField>
                      <FormField
                        label="Skills"
                        hint="Comma-separated, up to 25. Used by recruiter search."
                      >
                        <Input
                          value={skillsInput}
                          onChange={(e) => setSkillsInput(e.target.value)}
                          placeholder="react, python, aws…"
                        />
                      </FormField>

                      {/* Toggle row: title over description, control on the
                          right — the shadcn settings pattern. Was a bordered
                          grey bar with an uppercase bold label. */}
                      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                        <span className="space-y-1">
                          <span className="block text-sm font-medium text-foreground">
                            Share identity with recruiters
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Off means recruiters only ever see your anonymous alias.
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={share}
                          onChange={() => setShare(!share)}
                          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                        />
                      </label>
                    </>
                  )}

                  <div className="flex items-center gap-2 border-t border-border pt-4">
                    <Button
                      onClick={saveProfile}
                      className="flex-1 cursor-pointer rounded-lg !shadow-none hover:translate-y-0"
                    >
                      Save changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                      className="cursor-pointer rounded-lg !shadow-none hover:translate-y-0"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-4">
                  <Field label="Display name">{profile?.displayName || "—"}</Field>
                  <Field label="LinkedIn">
                    <span className="block truncate">{profile?.linkedInUrl || "—"}</span>
                  </Field>
                  <Field label="GitHub">
                    <span className="block truncate">{profile?.githubUrl || "—"}</span>
                  </Field>

                  {/* Same rationale as the edit form: candidate-only sections
                      are hidden for recruiter accounts. */}
                  {!isRecruiter && (
                    <>
                      <Field label="Target role">{profile?.targetRole || "—"}</Field>
                      <Field label={`Skills${skillCount > 0 ? ` (${skillCount})` : ""}`}>
                        {skillCount > 0 ? (
                          <span className="flex flex-wrap gap-1.5">
                            {visibleSkills.map((s) => (
                              <Badge key={s} variant="secondary" className="font-normal">
                                {s}
                              </Badge>
                            ))}
                            {/* Overflow toggle styled as one more chip, so the
                                row keeps its rhythm instead of gaining a stray
                                link. Reveals in place — no dialog, no truncation
                                the reader can't undo. */}
                            {hiddenSkillCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowAllSkills(true)}
                                className="inline-flex h-6 cursor-pointer items-center rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                              >
                                +{hiddenSkillCount} more
                              </button>
                            )}
                            {showAllSkills && skillCount > SKILL_PREVIEW_LIMIT && (
                              <button
                                type="button"
                                onClick={() => setShowAllSkills(false)}
                                className="inline-flex h-6 cursor-pointer items-center rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                              >
                                Show less
                              </button>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </Field>
                      {/* No Visibility row here. The summary strip above states
                          the current setting, and the edit form below carries the
                          toggle that changes it — repeating it read-only in
                          between just said the same thing a third time. */}
                    </>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

        </motion.div>

        {/* Resumes — candidates only. */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className={cn(CARD, "h-full")}>
            <CardHeader className={CARD_HEAD}>
              <div className="space-y-1">
                <CardTitle className="font-sans text-base font-semibold tracking-tight">
                  {isRecruiter ? "Candidate discovery" : "Your resumes"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRecruiter
                    ? "Search and shortlist candidates."
                    : "Every resume you've submitted for roasting."}
                </CardDescription>
              </div>
            </CardHeader>

            {/* Resumes are a list, not a grid of tiles — the reference
                dashboard's "Recent Documents" pattern. A two-up grid of cards
                gave each resume ~200px of mostly-empty box; a row gives it the
                60px its four values actually need, so four fit in the space one
                card used to take. */}
            {/* `flex-1` so the list area absorbs whatever extra height the equal
                -height row gives this card, instead of the card ending early and
                leaving a gap inside its own border. */}
            <CardContent className="flex-1 p-5">
              {isRecruiter ? (
                detailLoading ? (
                  <Skeleton className="h-40 w-full rounded-lg border border-border" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      Recruiters search candidates from the dashboard.
                    </p>
                    <Link href="/recruiter">
                      <Button className="cursor-pointer rounded-lg !shadow-none hover:translate-y-0">
                        Open recruiter dashboard
                      </Button>
                    </Link>
                  </div>
                )
              ) : detailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              ) : resumes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-12 text-center">
                  <FileText className="size-8 text-muted-foreground/60" aria-hidden />
                  <p className="text-sm text-muted-foreground">No resumes yet.</p>
                  <Link href="/upload">
                    <Button className="cursor-pointer rounded-lg !shadow-none hover:translate-y-0">
                      Upload resume
                    </Button>
                  </Link>
                </div>
              ) : (
                /* Scrolls past four rows. A row is 56px plus a 12px gap and its
                   rule, so 4 × ~69px lands at 276px — the cap sits a little above
                   that so the fifth row is clipped mid-height rather than hidden
                   cleanly, which is what tells you there's more to scroll.

                   `scrollbar-gutter:stable` reserves the scrollbar's width at all
                   times, so rows don't reflow by a few pixels the moment the list
                   grows past the cap. `pr-1` keeps the chevrons off the bar. */
                <ul
                  className="max-h-[296px] space-y-3 overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]"
                  aria-label="Your resumes"
                >
                  {resumes.map((r, index) => (
                    <li
                      key={r._id}
                      /* Rule between rows only. `border-border` is the near-black
                         component ink in this theme, so it's taken to 50% here —
                         at full strength a stack of them reads as a table grid. */
                      className={cn(
                        index < resumes.length - 1 && "border-b border-border/50 pb-3",
                      )}
                    >
                      <ResumeRow
                        id={r._id}
                        title={r.title}
                        version={r.version}
                        status={r.status}
                        overall={r.aiScore?.overall}
                        createdAt={r.createdAt}
                        candidateAlias={r.candidateAlias || r.userId?.anonymousUsername || "Anonymous"}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete account.

          Sits in its own 3-column grid with the same `gap-6`, so its single cell
          is exactly as wide as the Public profile card above it and its left and
          right edges land on the same rails. Spanning the full page made it a
          long, mostly-empty band; a third of the width is enough for the copy to
          wrap naturally and the button to sit right beneath it.

          It can't go *inside* the column above without making that column taller
          than the resume list again, which is the imbalance we just removed. */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
        <Card className={cn(CARD, "border-destructive/40")}>
          <div className="flex flex-col gap-3 p-4">
            <div className="min-w-0">
              <h2 className="font-sans text-sm font-medium tracking-tight text-foreground">
                Delete account
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permanently removes your profile, resumes, projects, comments, likes and votes.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteOpen(true);
              }}
              className="w-full cursor-pointer rounded-lg border-destructive/60 text-destructive !shadow-none hover:translate-y-0 hover:bg-destructive hover:text-destructive-foreground"
              data-testid="button-open-delete-account"
            >
              <Trash2 className="size-4" /> Delete account
            </Button>
          </div>
        </Card>
      </motion.div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-xl border border-destructive bg-card shadow-[var(--shadow-lg)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans text-base font-semibold tracking-tight text-destructive">
              Delete account?
            </DialogTitle>
            <DialogDescription>
              This permanently removes your profile, resumes, projects, comments, likes, and votes.
              Type <span className="font-mono font-medium text-foreground">{authUser?.email}</span>{" "}
              below to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={authUser?.email || "your email"}
            autoComplete="off"
            className="focus-visible:border-destructive focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.2)]"
            data-testid="input-confirm-email"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="cursor-pointer rounded-lg !shadow-none hover:translate-y-0"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleting ||
                !authUser?.email ||
                deleteConfirm.trim().toLowerCase() !== authUser.email.toLowerCase()
              }
              onClick={confirmDeleteAccount}
              className="cursor-pointer rounded-lg !shadow-none hover:translate-y-0"
              data-testid="button-confirm-delete-account"
            >
              {deleting ? "Deleting..." : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
