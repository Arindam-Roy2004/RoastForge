"use client";

import { uploadApi, resumeApi } from "@/lib/api";
import { formatStyleLabel, getDiceBearUrl, type AvatarStyle } from "@/lib/avatar";
import { ResumePiiEditor } from "@/components/resume-pii-editor";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, FileText, Pencil, RefreshCw, UploadCloud, X } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

// A background hex that's visible on both dark (#1a1f2b-ish) and light (#f9f6f1) card surfaces.
const AVATAR_BG = "d1d4f9";

function formatBytes(n: number): string {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type View = "form" | "review";

export default function UploadPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState<AvatarStyle>(DEFAULT_STYLE);
  const [view, setView] = useState<View>("form");
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const { fileUrl, fileType } = await uploadApi.resume(file);
      const created = await resumeApi.create({
        title: title.trim(),
        name: file.name,
        fileUrl,
        fileType,
        avatarStyle: style,
        avatarSeed: seed,
        avatarBackgroundColor: AVATAR_BG,
      });
      await refresh();
      toast.success(created.message || "Resume uploaded & queued!");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  if (loading || user?.role === "recruiter") {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-heading text-sm uppercase tracking-wider text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4 py-20">
        <Card className="w-full max-w-md border border-border rounded-lg shadow-[var(--shadow-md)] text-center p-8 bg-card">
          <h1 className="font-heading text-3xl mb-3 tracking-tighter">Sign in required</h1>
          <p className="text-sm text-muted-foreground mb-6 font-medium">Sign in to upload your resume for roasting.</p>
          <Link href="/login">
            <Button size="lg" className="font-heading tracking-wide border border-border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 transition-all rounded-lg">
              Sign in
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const canSubmit = !!file && !!title.trim() && !uploading;
  const cardHeadCls = "border-b border-border bg-muted/40 py-4";

  // ── Review view: edited PDF takes the screen, with a Back action ──────────
  if (view === "review" && file && previewUrl) {
    return (
      <div className="w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg tracking-tight leading-none">Review your resume</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {edited ? "Edits applied — this is what will be roasted." : "This is what will be roasted."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setView("form")}
            className="h-10 rounded-lg border border-border font-heading text-xs uppercase tracking-wider shadow-[var(--shadow-2xs)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] transition-all gap-1.5"
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
        </div>

        <div className="border border-border bg-white shadow-[var(--shadow-md)]">
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

  // ── Form view: upload + details, no preview clutter ───────────────────────
  return (
    <div className="w-full">
      <header className="mb-8">
        <h1 className="font-heading text-3xl sm:text-4xl tracking-tight">Upload your resume</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Drop a PDF, redact your personal details if you like, pick a card style, then send it to the forge.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Your resume */}
        <Card className="border border-border rounded-lg shadow-[var(--shadow-md)] bg-card overflow-hidden flex flex-col lg:h-[540px]">
          <CardHeader className={cardHeadCls}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-heading text-sm tracking-wide">Your resume</CardTitle>
                <CardDescription className="text-xs">PDF only · up to {MAX_UPLOAD_MB} MB</CardDescription>
              </div>
              {file && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 rounded-lg border border-border font-heading text-[11px] uppercase tracking-wider shadow-[var(--shadow-2xs)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] transition-all gap-1.5"
                >
                  <RefreshCw className="size-3.5" /> Replace
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col p-4">
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
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files?.[0]); }}
                className={cn(
                  "flex min-h-[240px] w-full flex-1 flex-col items-center justify-center gap-4 border border-dashed border-border bg-muted/30 px-6 text-center transition-colors",
                  "cursor-pointer hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  dragging && "border-primary bg-primary/10",
                )}
              >
                <div className="flex size-16 items-center justify-center rounded-full border border-border bg-background">
                  <UploadCloud className="size-7 text-muted-foreground" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-heading text-base">Drop your PDF here</p>
                  <p className="mt-1 text-xs text-muted-foreground">or click to browse · max {MAX_UPLOAD_MB} MB</p>
                </div>
              </button>
            ) : (
              <div className="flex flex-1 flex-col gap-3">
                {/* File region — fills the card like the dropzone, for visual balance */}
                <div className="relative flex flex-1 flex-col items-center justify-center gap-2.5 border border-border bg-muted/20 px-6 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Remove file"
                    onClick={clearFile}
                    className="absolute right-2 top-2 !shadow-none hover:translate-y-0"
                  >
                    <X className="size-4" />
                  </Button>
                  <div className="flex size-16 items-center justify-center rounded-full border border-border bg-background text-primary-strong">
                    <FileText className="size-7" strokeWidth={2} />
                  </div>
                  <p className="max-w-full break-all px-2 font-heading text-sm">{file.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{formatBytes(file.size)} · PDF</p>
                  {edited && (
                    <span className="inline-flex items-center gap-1.5 border border-border bg-primary/15 px-2 py-0.5 font-heading text-[10px] uppercase tracking-wider text-foreground">
                      <CheckCircle2 className="size-3 text-primary-strong" /> Edited
                    </span>
                  )}
                </div>

                {!edited ? (
                  <Button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    className="h-10 w-full shrink-0 rounded-lg border border-border font-heading text-xs uppercase tracking-wider shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] transition-all gap-2"
                  >
                    <Pencil className="size-4" /> Edit personal info
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setView("review")}
                    className="h-10 w-full shrink-0 rounded-lg border border-border font-heading text-xs uppercase tracking-wider shadow-[var(--shadow-2xs)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] transition-all gap-2"
                  >
                    <Eye className="size-4" /> Review edited resume
                  </Button>
                )}

                <p className="shrink-0 text-[11px] leading-relaxed text-muted-foreground">
                  {edited
                    ? "Personal info edited. Review your resume before uploading, or Replace to start over."
                    : <>Use <span className="font-medium text-foreground">Edit personal info</span> to remove your name, email, phone or links before uploading.</>}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-3 border border-destructive bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post details */}
        <Card className="border border-border rounded-lg shadow-[var(--shadow-md)] bg-card overflow-hidden flex flex-col lg:h-[540px]">
          <CardHeader className={cardHeadCls}>
            <CardTitle className="font-heading text-sm tracking-wide">Post details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5 p-4 min-h-0">
            <div className="space-y-2">
              <label htmlFor="post-title" className="text-[11px] font-heading uppercase tracking-[0.14em] text-muted-foreground">
                Post title
              </label>
              <Input
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New-grad SWE chasing FAANG"
                maxLength={120}
                className="h-10 rounded-lg border border-border bg-background text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
                required
              />
              <p className="text-[11px] text-muted-foreground">Shown on your gallery card.</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center border border-border bg-muted">
                  <Image
                    key={style}
                    src={getDiceBearUrl(seed, style, 96, { backgroundColor: AVATAR_BG })}
                    alt="Selected card avatar"
                    width={44}
                    height={44}
                    unoptimized
                  />
                </div>
                <div>
                  <p className="text-[11px] font-heading uppercase tracking-[0.14em] text-muted-foreground">Card style</p>
                  <p className="text-sm font-medium">{formatStyleLabel(style)}</p>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto border border-border bg-background p-2 [scrollbar-gutter:stable]">
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
                        "aspect-square border border-border bg-muted/40 p-1 transition-all",
                        "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        selected && "bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-background",
                      )}
                    >
                      <Image
                        src={getDiceBearUrl(seed, s, 80, { backgroundColor: AVATAR_BG })}
                        alt={formatStyleLabel(s)}
                        width={64}
                        height={64}
                        unoptimized
                        className="size-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          size="lg"
          className="h-12 w-full rounded-lg border border-border font-heading text-sm uppercase tracking-wide shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] transition-all disabled:opacity-60"
        >
          {uploading ? "Forging…" : "Upload & roast"}
        </Button>
        {!canSubmit && !uploading && (
          <p className="text-[11px] text-muted-foreground">
            {!file ? "Add a PDF and a title to continue." : "Give your post a title to continue."}
          </p>
        )}
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
            toast.success("Personal info updated. Review your resume below.");
          }}
        />
      )}
    </div>
  );
}
