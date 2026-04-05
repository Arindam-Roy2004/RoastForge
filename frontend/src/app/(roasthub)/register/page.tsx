"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ComicCard } from "@/components/comic-card";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ name, email, password, role }),
      });
      toast.success(res.message + " Check your email to verify before login.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <ComicCard variant="peach" shadow="large" className="w-full max-w-md">
        <h1 className={cn(display.className, "text-3xl text-center mb-1")}>Create Account</h1>
        <p className={cn(body.className, "text-center text-sm text-[#2c2c2c]/70 mb-6")}>
          Candidate or recruiter — you can tune visibility later.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={cn(display.className, "text-sm block mb-1")}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={cn(body.className, "w-full p-3 comic-border rounded-lg comic-shadow-3 bg-[#F2D5A3] focus:outline-none focus:bg-white transition-colors")} />
          </div>
          <div>
            <label className={cn(display.className, "text-sm block mb-1")}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={cn(body.className, "w-full p-3 comic-border rounded-lg comic-shadow-3 bg-[#F2D5A3] focus:outline-none focus:bg-white transition-colors")} />
          </div>
          <div>
            <label className={cn(display.className, "text-sm block mb-1")}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={cn(body.className, "w-full p-3 comic-border rounded-lg comic-shadow-3 bg-[#F2D5A3] focus:outline-none focus:bg-white transition-colors")} />
          </div>
          <div>
            <label className={cn(display.className, "text-sm block mb-1")}>I am a</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRole("candidate")} className={cn(display.className, "flex-1 comic-btn justify-center comic-shadow-3 comic-lift", role === "candidate" ? "bg-green-400" : "bg-beige")}>Candidate</button>
              <button type="button" onClick={() => setRole("recruiter")} className={cn(display.className, "flex-1 comic-btn justify-center comic-shadow-3 comic-lift", role === "recruiter" ? "bg-green-400" : "bg-beige")}>Recruiter</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className={cn(display.className, "w-full comic-btn bg-green-400 comic-shadow-4 comic-lift justify-center text-lg")}>
            {loading ? "Creating..." : "Create Account 🚀"}
          </button>
          <p className={cn(body.className, "text-center text-sm text-[#2c2c2c]/70")}>
            Already have an account?{" "}
            <Link href="/login" className="font-bold underline">Sign in</Link>
          </p>
        </form>
      </ComicCard>
    </div>
  );
}
