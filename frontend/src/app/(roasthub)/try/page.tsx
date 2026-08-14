"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, FileText, UploadCloud, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FlameIcon from "@/components/icons/flame-icon";
import { RoastScoreDial, RoastVerdictRadar } from "@/components/roast-verdict";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analysisApi, ApiRequestError, type RoastData } from "@/lib/api";
import { extractPdfText } from "@/lib/pdf-text";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";

/**
 * No-account trial roast.
 *
 * The PDF is read in the browser and only the extracted text is posted to the
 * API, so there's no upload, no stored file, and no throwaway account to clean
 * up later. The result lives in component state — navigating away discards it,
 * which is what "we don't keep your resume" should mean in practice.
 *
 * Two deliberate omissions versus the signed-in flow:
 *  - the personal-info editor, which exists because a *posted* resume is public.
 *    A trial roast is visible to nobody, so redaction would be ceremony.
 *  - the roast prose. The signed-in resume page shows the score and the
 *    five-point breakdown only, so this shows the same and no more.
 */

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));

const CARD_SHELL =
  "flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-md)] lg:h-[532px]";
const CARD_HEAD = "shrink-0 border-b border-border bg-muted/40 py-4";

function formatBytes(n: number): string {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type Phase = "idle" | "reading" | "roasting" | "done";

export default function TryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [roast, setRoast] = useState<RoastData | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 429 means the free quota is gone, which is an upsell moment, not a failure. */
  const [quotaReached, setQuotaReached] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signed-in users have the real thing (upload, post, gallery, comments), so
  // there's no reason to leave them on the stripped-down trial.
  useEffect(() => {
    if (loading || !user) return;
    router.replace(user.role === "recruiter" ? "/recruiter" : "/upload");
  }, [loading, user, router]);

  const busy = phase === "reading" || phase === "roasting";

  function reset() {
    setRoast(null);
    setError(null);
    setQuotaReached(false);
    setPhase("idle");
  }

  function acceptFile(f: File | undefined | null) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`File too large. Maximum ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setFile(f);
    reset();
  }

  function clearFile() {
    setFile(null);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function run() {
    if (!file) return;
    setError(null);
    setQuotaReached(false);
    setRoast(null);

    try {
      setPhase("reading");
      const text = await extractPdfText(file);

      setPhase("roasting");
      const res = await analysisApi.tryRoast(text);
      if (!res.data) throw new Error(res.message || "The roast came back empty.");

      setRoast(res.data);
      setPhase("done");
    } catch (err) {
      // PdfTextError and API errors both carry messages already written for the
      // user. A 429 is the quota wall, which reads as an upsell, not a fault.
      if (err instanceof ApiRequestError && err.status === 429) setQuotaReached(true);
      const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(message);
      setPhase("idle");
      toast.error(message);
    }
  }

  if (loading || user) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="label-mono text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      {/* Centred over the two-card grid below, matching /upload. */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl">Roast my resume</h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* ── Left: the file ─────────────────────────────────────────────── */}
        <Card className={CARD_SHELL}>
          <CardHeader className={CARD_HEAD}>
            <CardTitle className="text-sm">Your resume</CardTitle>
            <CardDescription className="text-xs">PDF only · up to {MAX_UPLOAD_MB} MB</CardDescription>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-4">
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse · max {MAX_UPLOAD_MB} MB
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="relative flex flex-1 flex-col items-center justify-center gap-2.5 border border-border bg-muted/20 px-6 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Remove file"
                    onClick={clearFile}
                    disabled={busy}
                    className="absolute right-2 top-2 !shadow-none hover:translate-y-0"
                  >
                    <X className="size-4" />
                  </Button>
                  <div className="flex size-16 items-center justify-center rounded-full border border-border bg-background text-primary-strong">
                    <FileText className="size-7" strokeWidth={2} />
                  </div>
                  <p className="max-w-full break-all px-2 font-heading text-sm">{file.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatBytes(file.size)} · PDF
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={run}
                  disabled={busy || phase === "done"}
                  aria-busy={busy}
                  className="label-mono h-11 w-full shrink-0 gap-2 rounded-lg border border-border text-[0.6875rem] shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] disabled:opacity-60"
                >
                  <FlameIcon size={16} strokeWidth={2.25} aria-hidden />
                  {busy ? "Roasting…" : phase === "done" ? "Done" : "Roast my resume"}
                </Button>
              </div>
            )}

            {error && !quotaReached && (
              <div role="alert" className="mt-3 border border-destructive bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}


          </CardContent>
        </Card>

        {/* ── Right: the verdict ─────────────────────────────────────────── */}
        <Card className={CARD_SHELL}>
          <CardHeader className={CARD_HEAD}>
            <CardTitle className="text-sm">The verdict</CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <AnimatePresence mode="wait">
              {busy && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-5"
                >
                  <div className="flex size-32 items-center justify-center rounded-full border border-border bg-background">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    >
                      <FlameIcon size={48} className="text-destructive" strokeWidth={2} />
                    </motion.div>
                  </div>
                  <div className="w-full space-y-3">
                    <div className="h-2.5 animate-pulse border border-border bg-muted" />
                    <div className="h-2.5 w-4/5 animate-pulse border border-border bg-muted" />
                    <div className="h-2.5 w-3/5 animate-pulse border border-border bg-muted" />
                  </div>
                </motion.div>
              )}

              {!busy && !roast && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
                >
                  <div
                    className={cn(
                      "flex size-16 items-center justify-center rounded-full border border-border",
                      quotaReached ? "bg-accent" : "bg-muted/40",
                    )}
                  >
                    {quotaReached ? (
                      <FlameIcon size={28} className="text-primary-strong" strokeWidth={2} />
                    ) : error ? (
                      <AlertTriangle className="size-7 text-destructive" strokeWidth={2} />
                    ) : (
                      <FlameIcon size={28} className="text-muted-foreground" strokeWidth={2} />
                    )}
                  </div>

                  {quotaReached ? (
                    <>
                      <h2 className="text-lg">Free roast used</h2>
                      <Link href="/register" className="w-full max-w-[240px]">
                        <Button
                          size="sm"
                          className="h-10 w-full rounded-lg border border-border shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5"
                        >
                          Sign in for unlimited
                          <ArrowRight aria-hidden />
                        </Button>
                      </Link>
                    </>
                  ) : null}
                </motion.div>
              )}

              {!busy && roast && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="scrollbar-thin min-h-0 flex-1 space-y-3.5 overflow-y-auto p-4"
                >
                  <RoastScoreDial score={roast.score} bars={roast.verdictBars} />

                  <RoastVerdictRadar bars={roast.verdictBars} />

                  <Link href="/register" className="block">
                    <Button
                      size="sm"
                      className="h-10 w-full rounded-lg border border-border shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5"
                    >
                      Sign in to save &amp; post
                      <ArrowRight aria-hidden />
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

    </motion.div>
  );
}
