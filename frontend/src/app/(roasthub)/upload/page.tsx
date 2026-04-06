"use client";

import { cn } from "@/lib/utils";
import { getToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileText, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      fd.append("file", file);
      const headers: HeadersInit = {};
      const t = getToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      const uploadRes = await fetch(`${API_BASE}/api/upload/resume`, { method: "POST", headers, body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.message || "Failed to upload file to cloud");

      const { fileUrl, fileType } = uploadJson.data;

      const createRes = await fetch(`${API_BASE}/api/resumes`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, fileUrl, fileType })
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.message || "Failed to save resume profile");

      toast.success(createJson.message || "Resume uploaded & queued!");
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
        <Card className="w-full max-w-md border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center p-8 animate-pulse">
           <CardTitle className="font-heading uppercase text-xl">Loading...</CardTitle>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="w-full max-w-md border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center p-8 bg-card">
          <h1 className="font-heading uppercase text-3xl mb-4">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-6">You need to sign in to upload your resume for roasting!</p>
          <Link href="/login">
            <Button className="border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase text-lg px-8">
              Sign In to Upload
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 py-12">
      <Card className="w-full max-w-lg border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader className="text-center space-y-3 pb-6 border-b-4 border-border bg-muted">
          <div className="mx-auto bg-primary w-14 h-14 flex items-center justify-center rounded-full border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-2">
            <UploadCloud className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-4xl font-heading uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">Enter The Forge</CardTitle>
          <CardDescription className="text-base text-muted-foreground font-medium max-w-sm mx-auto">
            Submit your PDF resume to the forge. Let the community and AI mercilessly break it down so recruiters do not have to (constructively).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={submit} className="space-y-6">
            {!file ? (
              <div 
                className="border-4 border-dashed border-border bg-muted/30 p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => ref.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-background border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-heading uppercase text-lg">Click to Upload</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF up to 5MB</p>
                </div>
                <input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
                <Button type="button" variant="outline" className="mt-2 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase" onClick={(e: React.MouseEvent) => { e.stopPropagation(); ref.current?.click(); }}>
                   Select File
                </Button>
              </div>
            ) : (
              <div className="border-4 border-border bg-primary/10 p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className="w-10 h-10 bg-primary/20 border-2 border-border flex items-center justify-center shrink-0">
                     <FileText className="w-5 h-5 text-primary" />
                   </div>
                   <div className="min-w-0">
                     <p className="font-heading text-sm truncate">{file.name}</p>
                     <p className="text-xs text-muted-foreground font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                   </div>
                </div>
                <Button 
                   type="button" 
                   variant="destructive" 
                   size="icon"
                   className="border-2 border-border rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all shrink-0" 
                   onClick={() => { setFile(null); if (ref.current) ref.current.value = ""; }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="border-4 border-destructive bg-destructive/10 p-3 flex flex-col gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-medium text-sm">
                 <span className="font-heading uppercase text-destructive text-xs">Error</span>
                 {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!file || uploading}
              className="w-full h-14 border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase text-xl"
            >
              {uploading ? "Uploading to Forge..." : "Upload & Roast! 🔥"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted p-6 border-t-4 border-border flex flex-col items-start gap-2">
           <p className="font-heading uppercase tracking-wider text-sm">Tips for a good roast:</p>
           <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
             <li>Upload a clean, readable PDF (no scanned images).</li>
             <li>Include your target role for context.</li>
             <li>Feedback here is brutally honest — don't take it personally!</li>
           </ul>
        </CardFooter>
      </Card>
    </div>
  );
}
