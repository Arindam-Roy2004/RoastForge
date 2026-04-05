"use client";

import { ComicCard } from "@/components/comic-card";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FaFilePdf, FaUpload, FaTimes } from "react-icons/fa";
import Link from "next/link";

import { useAuth } from "@/store/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF files are allowed."); return; }
    if (f.size > 5 * 1024 * 1024) { setError("File too large. Maximum 5 MB."); return; }
    setFile(f);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const headers: HeadersInit = {};
      const t = getToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      const res = await fetch(`${API_BASE}/api/resume/upload`, { method: "POST", headers, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      toast.success(json.message || "Resume uploaded & queued!");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <ComicCard variant="cream" shadow="medium" className="text-center font-bold">
          Loading...
        </ComicCard>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <ComicCard variant="yellow" shadow="large" className="text-center max-w-md">
          <h1 className={cn(display.className, "text-3xl mb-2")}>Sign In Required</h1>
          <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 mb-4")}>
            You need to sign in to upload your resume for roasting!
          </p>
          <Link href="/login" className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-base")}>
            Sign In to Upload
          </Link>
        </ComicCard>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <ComicCard variant="cream" shadow="large" className="w-full max-w-lg">
        <h1 className={cn(display.className, "text-3xl text-center mb-1")}>Upload Your Resume</h1>
        <p className={cn(body.className, "text-center text-sm text-[#2c2c2c]/70 mb-6")}>
          Ready to get roasted? Upload your resume PDF and let the community + AI give you feedback!
        </p>
        <form onSubmit={submit} className="space-y-5">
          <div>
            {!file ? (
              <div className="flex flex-col items-center gap-3 p-6 rounded-2xl comic-border bg-[#F8E4C6] comic-shadow-3">
                <FaUpload className="text-3xl text-[#2c2c2c]/50" />
                <p className={cn(display.className, "text-base")}>Upload Your Resume</p>
                <p className={cn(body.className, "text-xs text-[#2c2c2c]/60")}>PDF up to 5 MB</p>
                <input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
                <button type="button" onClick={() => ref.current?.click()} className={cn(display.className, "comic-btn bg-yellow comic-shadow-3 comic-lift text-sm")}>
                  <FaFilePdf /> Choose File
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-2xl comic-border bg-green-200 comic-shadow-3">
                <FaFilePdf className="text-2xl text-[#2c2c2c]" />
                <div className="flex-1 min-w-0">
                  <p className={cn(display.className, "text-sm truncate")}>{file.name}</p>
                  <p className={cn(body.className, "text-xs text-[#2c2c2c]/60")}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => { setFile(null); if (ref.current) ref.current.value = ""; }} className="comic-icon-btn bg-red-300 comic-shadow-2 comic-lift w-8 h-8">
                  <FaTimes />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl comic-border-2 bg-red-200 p-3 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className={cn(display.className, "w-full comic-btn bg-orange-400 hover:bg-orange-500 comic-shadow-4 comic-lift justify-center text-lg disabled:opacity-50")}
          >
            {uploading ? "Uploading..." : "Upload Resume for Roasting! 🔥"}
          </button>
        </form>

        <ComicCard variant="light" shadow="small" className="mt-6 text-sm">
          <p className={cn(display.className, "text-base mb-2")}>Tips for Getting Great Feedback:</p>
          <ul className={cn(body.className, "list-disc list-inside space-y-1 text-[#2c2c2c]/80")}>
            <li>Upload a clean, text-based PDF (not scanned images)</li>
            <li>Mention your target industry or role in discussions</li>
            <li>Keep it fun — this is a playful roasting environment!</li>
            <li>Remember to give constructive feedback to others too</li>
          </ul>
        </ComicCard>
      </ComicCard>
    </div>
  );
}
