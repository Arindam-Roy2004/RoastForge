"use client";

import { uploadApi, resumeApi, POST_BODY_MAX, POST_TITLE_MAX } from "@/lib/api";
import {
  formatStyleLabel,
  getDiceBearUrl,
  getPostCardBg,
  randomCardColorHex,
  type AvatarStyle,
} from "@/lib/avatar";
import { ResumePiiEditor } from "@/components/resume-pii-editor";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, Eye, FileText, Pencil, RefreshCw, Send, UploadCloud, X } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));
const DEFAULT_STYLE: AvatarStyle = "notionists";

// Only character/face styles that render visibly in both light and dark mode.
// Filtered out: glass, icons, identicon, rings, shapes (abstract/invisible on light bg).
const VISIBLE_STYLES: AvatarStyle[] = [
  "adventurer",
  "adventurer-neutral",
  "avataaars",
  "avataaars-neutral",
  "big-ears",
  "big-ears-neutral",
  "big-smile",
  "bottts",
  "bottts-neutral",
  "croodles",
  "croodles-neutral",
  "dylan",
  "fun-emoji",
  "initials",
  "lorelei",
  "lorelei-neutral",
  "micah",
  "miniavs",
  "notionists",
  "notionists-neutral",
  "open-peeps",
  "personas",
  "pixel-art",
  "pixel-art-neutral",
  "thumbs",
];

// Avatars are drawn without a background of their own, so the card colour fills
// the whole avatar area instead of showing a second square inside it.
const AVATAR_BG = "transparent";

/** Same card shell and header bar as the profile page, so the two read as one app. */
const CARD = "rounded-xl border border-border bg-card shadow-[var(--shadow-xs)]";
const CARD_HEAD =
  "flex flex-row items-start justify-between gap-4 space-y-0 border-b border-border px-5 py-4";

/**
 * The shared `ui/button` is set in uppercase mono for the product chrome. This
 * page is a form, and uppercase labels beside sentence-case field labels read as
 * two different designs — so its buttons take the body sans instead, matching
 * the navbar. Utilities beat the `label-mono` component class, so this wins.
 */
const BTN = "rounded-lg font-sans text-sm font-medium tracking-normal normal-case !shadow-none hover:translate-y-0";

function formatBytes(n: number): string {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * `12/200`-style counter. Turns destructive in the last 10% (capped at 100
 * characters), which is the point where a writer actually needs to know.
 */
function CharCount({ id, length, max }: { id: string; length: number; max: number }) {
  const near = max - length <= Math.min(100, Math.round(max * 0.1));
  return (
    <span
      id={id}
      className={cn("text-xs tabular-nums text-muted-foreground", near && "text-destructive")}
    >
      {length}/{max}
    </span>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5">
      <p className="text-sm font-medium text-destructive">{message}</p>
    </div>
  );
}

type View = "form" | "review";

export default function UploadPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  // Sends signed-out visitors to /login?next=/upload instead of parking them on
  // a page they can't use.
  const { user, loading } = useRequireAuth();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  // Optional post body, stored as `blurb`. Plain text; line breaks are kept.
  const [body, setBody] = useState("");
  const [style, setStyle] = useState<AvatarStyle>(DEFAULT_STYLE);
  // This post's card colour, picked once per visit and saved with the post, so
  // the preview shows exactly what the gallery will — and your next post gets
  // its own colour rather than repeating this one.
  const [cardColor] = useState(randomCardColorHex);
  const [view, setView] = useState<View>("form");
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const seed = user?.id || "preview";

  useEffect(() => {
    if (!loading && user?.role === "recruiter") router.replace("/recruiter");
  }, [loading, user?.role, router]);

  function acceptFile(f: File | undefined | null) {
    if (!f) return;
    if (f.type !== "application/pdf") return setError("Only PDF files are allowed.");
    if (f.size > MAX_UPLOAD_BYTES) return setError(`File too large. Maximum ${MAX_UPLOAD_MB} MB.`);
    setFile(f);
    setEdited(false);
    setError(null);
  }

  function clearFile() {
    setFile(null);
    setEdited(false);
    setView("form");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    if (!file) {
      const message = "Add a PDF before posting.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!title.trim()) {
      const message = "Add a post title before posting.";
      setError(message);
      toast.error(message, { description: "Your title appears on the gallery card." });
      // The title field only exists on the form view. Switch back first, then
      // focus once React has committed the form.
      setView("form");
      requestAnimationFrame(() => titleInputRef.current?.focus());
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { fileUrl, fileType } = await uploadApi.resume(file);
      const created = await resumeApi.create({
        title: title.trim(),
        name: file.name.slice(0, 120),
        blurb: body.trim(),
        fileUrl,
        fileType,
        avatarStyle: style,
        avatarSeed: seed,
        avatarBackgroundColor: cardColor,
      });
      await refresh();
      toast.success(created.message || "Resume posted & queued!");
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast.error(message, { description: "Your resume was not posted. You can try again." });
      setUploading(false);
    }
  }

  if (loading || user?.role === "recruiter") {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // useRequireAuth has already scheduled the redirect to /login at this point.
  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  const canSubmit = !!file && !!title.trim() && !uploading;
  const submitHint = !file
    ? "Add a PDF and a title to continue."
    : !title.trim()
      ? "Give your post a title to continue."
      : null;

  // ── Review view: edited PDF takes the screen; posting is available here ───
  if (view === "review" && file && previewUrl) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setView("form")}
            aria-label="Back to post details"
            title="Back to post details"
            className="shrink-0 rounded-lg"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate font-sans text-xl font-semibold tracking-tight">
            Review your post
          </h1>
          <Button
            type="button"
            onClick={submit}
            disabled={uploading}
            aria-busy={uploading}
            className={cn(BTN, "shrink-0")}
          >
            <Send className="size-4" />
            {uploading ? "Posting…" : "Post"}
          </Button>
        </div>

        {/* Read-only summary of what's being posted. The title used to be a
            second editable input here, duplicating the form; editing now has one
            home, one click away. */}
        <Card className={CARD}>
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs text-muted-foreground">Title</p>
              <p
                className={cn(
                  "break-words text-base font-medium tracking-tight",
                  !title.trim() && "text-muted-foreground",
                )}
              >
                {title.trim() || "No title yet"}
              </p>
              {body.trim() && (
                <p className="line-clamp-4 whitespace-pre-line break-words pt-1 text-sm text-muted-foreground">
                  {body.trim()}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView("form")}
              className={cn(BTN, "shrink-0")}
            >
              <Pencil className="size-3.5" /> Edit details
            </Button>
          </div>
        </Card>

        {error && <ErrorNote message={error} />}

        {/* White on purpose in both themes: this is the PDF page itself. */}
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-xs)]">
          <iframe
            key={previewUrl}
            src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
            title="Edited resume preview"
            className="h-[82vh] w-full"
          />
        </div>
      </div>
    );
  }

  // ── Form view: one composer, card style alongside ─────────────────────────
  return (
    <div className="flex w-full flex-col gap-6">
      {/* Masthead, same shape as the profile page's. */}
      <header className="border-b border-border pb-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">Create a post</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your resume and tell people what you want roasted.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Composer: title, body, attachment, then the action bar. */}
        <Card className={cn(CARD, "lg:col-span-2")}>
          <CardHeader className={CARD_HEAD}>
            <div className="space-y-1">
              <CardTitle className="font-sans text-base font-semibold tracking-tight">
                Post details
              </CardTitle>
              <CardDescription className="text-xs">
                The title and note show on your gallery card.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="post-title" className="text-sm font-medium text-foreground">
                  Title
                </label>
                <CharCount id="post-title-count" length={title.length} max={POST_TITLE_MAX} />
              </div>
              <Input
                ref={titleInputRef}
                id="post-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. New-grad SWE chasing backend roles"
                maxLength={POST_TITLE_MAX}
                aria-describedby="post-title-count"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="post-body" className="text-sm font-medium text-foreground">
                  Body <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <CharCount id="post-body-count" length={body.length} max={POST_BODY_MAX} />
              </div>
              <Textarea
                id="post-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What should people focus on? e.g. 2 years of experience, targeting backend roles, no callbacks from 150 applications."
                maxLength={POST_BODY_MAX}
                aria-describedby="post-body-hint post-body-count"
              />
              <p id="post-body-hint" className="text-xs text-muted-foreground">
                Plain text. Line breaks are kept.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Resume</p>
                <p className="text-xs text-muted-foreground">PDF only · up to {MAX_UPLOAD_MB} MB</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                aria-label="Resume PDF file"
                className="hidden"
                onChange={(e) => acceptFile(e.target.files?.[0])}
              />

              {!file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    acceptFile(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
                    dragging && "border-primary bg-primary/5",
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-full border border-border bg-background">
                    <UploadCloud aria-hidden className="size-5 text-muted-foreground" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-foreground">
                      Drag and drop your PDF
                    </span>
                    <span className="block text-xs text-muted-foreground">or click to browse</span>
                  </span>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Attached file, in the same row anatomy as "Your resumes" on
                      the profile page: tinted tile, name, one metadata line. */}
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                      <FileText aria-hidden className="size-5 text-primary-strong" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="tabular-nums">{formatBytes(file.size)}</span>
                        <span aria-hidden>·</span>
                        <span>PDF</span>
                        {edited && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-1 text-primary-strong">
                              <CheckCircle2 aria-hidden className="size-3" /> Personal info edited
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Replace file"
                        title="Replace file"
                        className="rounded-md"
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={clearFile}
                        aria-label="Remove file"
                        title="Remove file"
                        className="rounded-md"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {!edited ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditorOpen(true)}
                      className={cn(BTN, "w-full")}
                    >
                      <Pencil className="size-4" /> Edit personal info
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setView("review")}
                      className={cn(BTN, "w-full")}
                    >
                      <Eye className="size-4" /> Review edited resume
                    </Button>
                  )}
                </div>
              )}
            </div>

            {error && <ErrorNote message={error} />}
          </CardContent>

          {/* Action bar: hint left, Post right — the composer pattern. */}
          <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{submitHint ?? "Ready to post."}</p>
            <Button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-busy={uploading}
              className={cn(BTN, "w-full sm:w-auto")}
            >
              <Send className="size-4" />
              {uploading ? "Posting…" : "Post"}
            </Button>
          </div>
        </Card>

        {/* Card style: a live preview of the gallery card, then the picker. */}
        <Card className={CARD}>
          <CardHeader className={CARD_HEAD}>
            <div className="space-y-1">
              <CardTitle className="font-sans text-base font-semibold tracking-tight">
                Card style
              </CardTitle>
              <CardDescription className="text-xs">{formatStyleLabel(style)}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            {/* Mirrors the gallery card's markup so what you see here is what
                gets posted: same background, same avatar, same text styles. */}
            <div aria-hidden className="overflow-hidden rounded-lg border border-border">
              <div className={cn("relative aspect-[5/4] border-b border-border", getPostCardBg(cardColor, seed))}>
                <Image
                  key={style}
                  src={getDiceBearUrl(seed, style, 176, { backgroundColor: AVATAR_BG })}
                  alt=""
                  width={176}
                  height={176}
                  unoptimized
                  className="h-full w-full object-contain p-5"
                />
              </div>
              <div className="space-y-1 p-3.5">
                <p
                  className={cn(
                    "line-clamp-2 text-sm leading-snug font-medium tracking-tight",
                    title.trim() ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {title.trim() || "Your post title"}
                </p>
                {body.trim() && (
                  <p className="line-clamp-2 whitespace-pre-line break-words text-xs text-muted-foreground">
                    {body.trim()}
                  </p>
                )}
                {user.anonymousUsername && (
                  <p className="truncate text-xs text-muted-foreground">u/{user.anonymousUsername}</p>
                )}
              </div>
            </div>

            <div
              role="group"
              aria-label="Card avatar style"
              className="grid max-h-56 grid-cols-5 content-start gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
            >
              {VISIBLE_STYLES.map((s) => {
                const selected = s === style;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    aria-pressed={selected}
                    aria-label={formatStyleLabel(s)}
                    title={formatStyleLabel(s)}
                    className={cn(
                      "aspect-square cursor-pointer rounded-md border border-border bg-muted/40 p-1 transition-colors",
                      "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
                      selected && "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-background",
                    )}
                  >
                    <Image
                      src={getDiceBearUrl(seed, s, 80, { backgroundColor: AVATAR_BG })}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="size-full object-contain"
                    />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {editorOpen && file && (
        <ResumePiiEditor
          file={file}
          onCancel={() => setEditorOpen(false)}
          onApply={(next) => {
            setFile(next);
            setEdited(true);
            setError(null);
            setEditorOpen(false);
            setView("review");
            toast.success("Personal info updated");
          }}
        />
      )}
    </div>
  );
}
