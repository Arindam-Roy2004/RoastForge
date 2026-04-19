"use client";

import { uploadApi, resumeApi } from "@/lib/api";
import { AVATAR_STYLES, type AvatarRotate, type AvatarStyle } from "@/lib/avatar";
import type { AvatarCustomize } from "@/components/upload-avatar-card";
import { AvatarControlsCard, AvatarGalleryCard } from "@/components/upload-avatar-card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileText, X } from "lucide-react";
import { CloudUploadIcon } from "@/components/icons/cloud-upload-icon";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));

const ALLOWED_ROTATES = [0, 90, 180, 270] as const;

function coerceRotate(raw: number | undefined): AvatarRotate {
  return (ALLOWED_ROTATES as readonly number[]).includes(raw ?? 0) ? (raw as AvatarRotate) : 0;
}

function defaultAvatarState(
  user: {
    id: string;
    preferredAvatarStyle?: string | null;
    preferredAvatarBackgroundColor?: string | null;
    preferredAvatarFlip?: boolean;
    preferredAvatarRotate?: number;
    preferredAvatarRadius?: number;
    preferredAvatarScale?: number;
  } | null,
): AvatarCustomize {
  if (!user) {
    return { style: "bottts", seed: "", backgroundColor: null, flip: false, rotate: 0, radius: 0, scale: 100 };
  }
  const pref = user.preferredAvatarStyle;
  const style: AvatarStyle =
    pref && (AVATAR_STYLES as readonly string[]).includes(pref) ? (pref as AvatarStyle) : "bottts";
  return {
    style,
    seed: user.id,
    backgroundColor: user.preferredAvatarBackgroundColor ?? null,
    flip: Boolean(user.preferredAvatarFlip),
    rotate: coerceRotate(user.preferredAvatarRotate),
    radius: Number(user.preferredAvatarRadius ?? 0),
    scale: Number(user.preferredAvatarScale ?? 100),
  };
}

// ─── Resume card (left column) ───────────────────────────────────────────────

function FileSlot({
  file,
  onClick,
  onClear,
}: {
  file: File | null;
  onClick: () => void;
  onClear: () => void;
}) {
  if (!file) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex-1 min-h-[150px] w-full border-[3px] border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-3",
          "cursor-pointer hover:bg-muted/50 transition-colors rounded-none px-5 py-6",
        )}
      >
        <div className="w-14 h-14 rounded-full bg-background border-2 border-border flex items-center justify-center">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-heading text-sm">Click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">PDF up to {MAX_UPLOAD_MB}MB</p>
        </div>
      </button>
    );
  }

  return (
    <div className="flex-1 min-h-[150px] border-[3px] border-border bg-background flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 p-4 bg-muted/20">
        <div className="w-14 h-14 rounded-full bg-primary/15 border-2 border-border flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <p className="font-heading text-xs uppercase tracking-[0.14em] text-muted-foreground">Ready to forge</p>
      </div>
      <div className="border-t-[3px] border-border p-2.5 flex items-center gap-2.5">
        <div className="p-2 bg-primary/20 border-2 border-border text-primary shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading truncate text-sm">{file.name}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="Remove file"
          onClick={onClear}
          className="!shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ResumeCard({
  file,
  title,
  error,
  onPickFile,
  onTitleChange,
  onClearFile,
  fileInputRef,
}: {
  file: File | null;
  title: string;
  error: string | null;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTitleChange: (v: string) => void;
  onClearFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Card className="border-[3px] border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card rounded-none flex flex-col h-full overflow-hidden">
      <CardHeader className="border-b-[3px] border-border bg-muted/40 py-3 space-y-0.5 shrink-0">
        <CardTitle className="font-heading text-sm tracking-wide">Resume & title</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          PDF only — parsed for the AI roast and shown on your post.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-4 flex flex-col gap-3">
        <FileSlot file={file} onClick={() => fileInputRef.current?.click()} onClear={onClearFile} />

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          aria-label="Resume PDF file"
          className="hidden"
          onChange={onPickFile}
        />

        {error && (
          <div className="bg-destructive/10 border-[3px] border-destructive p-3">
            <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1">Error</p>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <label className="flex flex-col gap-2 shrink-0">
          <span className="text-[11px] font-heading uppercase tracking-[0.14em] text-muted-foreground">Post title</span>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. New grad SWE trying to break into FAANG"
            className="border-[3px] border-border rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium h-10 text-sm"
            required
          />
          <span className="text-[11px] text-muted-foreground">Shown on your Hall of Shame card.</span>
        </label>

        <div className="mt-auto border-t-[3px] border-border pt-3 shrink-0">
          <p className="text-[10px] font-heading uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Tips</p>
          <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4 marker:text-border">
            <li>Clean, readable PDF (no scanned images).</li>
            <li>Include your target role in the title.</li>
            <li>Feedback is brutal — don&apos;t take it personally.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState<AvatarCustomize>(() => defaultAvatarState(null));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (user?.role === "recruiter") router.replace("/recruiter");
  }, [loading, user?.role, router]);

  useEffect(() => {
    if (!user) return;
    setAvatar(defaultAvatarState(user));
  }, [user]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF files are allowed."); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setError(`File too large. Maximum ${MAX_UPLOAD_MB} MB.`); return; }
    setFile(f);
    setError(null);
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { fileUrl, fileType } = await uploadApi.resume(file);
      const created = await resumeApi.create({
        title: title.trim(),
        name: file.name,
        fileUrl,
        fileType,
        avatarStyle: avatar.style,
        avatarSeed: avatar.seed.trim(),
        avatarBackgroundColor: avatar.backgroundColor,
        avatarFlip: avatar.flip,
        avatarRotate: avatar.rotate,
        avatarRadius: avatar.radius,
        avatarScale: avatar.scale,
      });
      await refresh();
      toast.success(created.message || "Resume uploaded & queued!");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 p-4">
        <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center p-8 animate-pulse">
          <CardTitle className="font-heading text-xl tracking-wide">Loading...</CardTitle>
        </Card>
      </div>
    );
  }

  if (user?.role === "recruiter") {
    return (
      <div className="flex items-center justify-center py-16 p-4">
        <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center p-8 bg-card">
          <CardTitle className="font-heading text-xl tracking-wide">Redirecting…</CardTitle>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center p-8 bg-card">
          <h1 className="font-heading text-3xl mb-4 tracking-tighter">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-6 font-medium">
            You need to sign in to upload your resume for roasting!
          </p>
          <Link href="/login">
            <Button size="lg" className="font-heading tracking-wide">
              Sign In to Upload
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-6 lg:py-8">
      <div className="w-full max-w-[1760px] mx-auto space-y-6">
        <header className="text-center space-y-1.5">
          <div className="mx-auto bg-primary w-12 h-12 flex items-center justify-center rounded-full border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CloudUploadIcon size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-heading tracking-tight">Enter the Forge</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-xl mx-auto">
            Drop your PDF, tune your card, pick a vibe. The roast is still the main event.
          </p>
        </header>

        <form onSubmit={submit} className="flex flex-col gap-6">
          <div
            className={cn(
              "grid gap-4 lg:gap-5 items-stretch",
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
              "lg:h-[calc(100vh-13rem)] lg:min-h-[520px] lg:max-h-[700px]",
            )}
          >
            <ResumeCard
              file={file}
              title={title}
              error={error}
              onPickFile={handleFile}
              onTitleChange={setTitle}
              onClearFile={clearFile}
              fileInputRef={fileInputRef}
            />

            <AvatarControlsCard value={avatar} onChange={setAvatar} />

            <div className="md:col-span-2 lg:col-span-1 h-full min-h-[420px]">
              <AvatarGalleryCard value={avatar} onChange={setAvatar} />
            </div>
          </div>

          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2">
            <Button
              type="submit"
              disabled={uploading || !title.trim() || !file}
              size="lg"
              className="w-full h-12 text-sm font-heading tracking-wide"
            >
              {uploading ? "Forging..." : "Upload & Roast!"}
            </Button>
            {(!file || !title.trim()) && (
              <p className="text-[11px] text-muted-foreground">
                Upload a PDF and give it a title to enable submission.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
