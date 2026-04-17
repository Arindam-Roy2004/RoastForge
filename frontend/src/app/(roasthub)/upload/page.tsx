"use client";

import { uploadApi, resumeApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";
import { CloudUploadIcon } from "@/components/icons/cloud-upload-icon";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Matches backend default UPLOAD_MAX_BYTES (10 * 1024 * 1024).
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (user?.role === "recruiter") {
      router.replace("/recruiter");
    }
  }, [loading, user?.role, router]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF files are allowed."); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setError(`File too large. Maximum ${MAX_UPLOAD_MB} MB.`); return; }
    setFile(f);
    setError(null);
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
      });
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
          <h1 className="font-heading text-3xl mb-4 tracking-tighter ">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-6 font-medium">You need to sign in to upload your resume for roasting!</p>
          <Link href="/login">
            <Button className="border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading text-lg px-8 h-12 tracking-wide">
              Sign In to Upload
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 py-12">
      <Card className="border-[3px] border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card rounded-none overflow-hidden max-w-2xl mx-auto w-full">
        <CardHeader className="text-center bg-muted/50 border-b-[3px] border-border py-8 md:py-12 relative overflow-hidden">
          <div className="mx-auto bg-primary w-14 h-14 flex items-center justify-center rounded-full border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3">
            <CloudUploadIcon size={28} className="text-primary-foreground" />
          </div>
          <CardTitle className="text-4xl font-heading tracking-tight text-foreground">
            Enter the Forge
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground font-medium max-w-sm mx-auto">
            Submit your PDF resume to the forge. Let the community and AI mercilessly break it down so recruiters do not have to (constructively).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={submit} className="space-y-6">
            {!file ? (
              <div 
                className="border-[3px] border-dashed border-border bg-muted/30 p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => ref.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-background border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-heading text-lg">Click to Upload</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF up to {MAX_UPLOAD_MB}MB</p>
                </div>
                <input
                  ref={ref}
                  id="resume-file"
                  type="file"
                  accept="application/pdf"
                  aria-label="Resume PDF file"
                  className="hidden"
                  onChange={handleFile}
                />
                <Button type="button" variant="outline" className="mt-2 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading" onClick={(e: React.MouseEvent) => { e.stopPropagation(); ref.current?.click(); }}>
                   Select File
                </Button>
              </div>
            ) : (
              <div className="border-[3px] border-border p-4 bg-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
                <div className="p-2 bg-primary/20 border-2 border-border text-primary shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading truncate text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="destructive" size="icon" onClick={() => { setFile(null); if (ref.current) ref.current.value = ""; }} className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all shrink-0 w-8 h-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border-[3px] border-destructive p-3">
                <p className="text-xs font-bold text-destructive uppercase tracking-widest mb-1">Error</p>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Title input */}
            <div className="space-y-2">
              <label className="text-sm font-heading tracking-wide">Post Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New grad SWE trying to break into FAANG"
                className="border-[3px] border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:ring-offset-0 font-medium h-12"
                required
              />
              <p className="text-xs text-muted-foreground">This title will be shown on the Hall of Shame card.</p>
            </div>

            <Button 
              type="submit" 
              disabled={uploading || !title.trim()} 
              className="w-full h-14 text-lg border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {uploading ? "Forging..." : "Upload & Roast! 🔥"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/40 border-t-[3px] border-border p-6 md:p-8 flex flex-col items-start text-left">
          <h3 className="font-heading text-sm mb-3 tracking-wide">Tips for a good roast:</h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5 font-medium marker:text-border">
            <li>Upload a clean, readable PDF (no scanned images).</li>
            <li>Include your target role for context.</li>
            <li>Feedback here is brutally honest — don't take it personally!</li>
          </ul>
        </CardFooter>
      </Card>
    </div>
  );
}
