"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ComicCard } from "@/components/comic-card";
import { apiFetch, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<{ user: unknown; accessToken: string }>("/api/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      if (res.data?.accessToken) setToken(res.data.accessToken);
      toast.success(res.message);
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <ComicCard variant="cream" shadow="large" className="w-full max-w-md">
        <h1 className={cn(display.className, "text-3xl text-center mb-1")}>Sign In</h1>
        <p className={cn(body.className, "text-center text-sm text-[#2c2c2c]/70 mb-6")}>
          Access your SignalTalent workspace.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={cn(display.className, "text-sm block mb-1")}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(body.className, "w-full p-3 comic-border rounded-lg comic-shadow-3 bg-[#F2D5A3] focus:outline-none focus:bg-white transition-colors")}
            />
          </div>
          <div>
            <label className={cn(display.className, "text-sm block mb-1")}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={cn(body.className, "w-full p-3 comic-border rounded-lg comic-shadow-3 bg-[#F2D5A3] focus:outline-none focus:bg-white transition-colors")}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn(display.className, "w-full comic-btn bg-green-400 comic-shadow-4 comic-lift justify-center text-lg")}
          >
            {loading ? "Signing in..." : "Sign In 🔥"}
          </button>
          <p className={cn(body.className, "text-center text-sm text-[#2c2c2c]/70")}>
            No account?{" "}
            <Link href="/register" className="font-bold underline">
              Register
            </Link>
          </p>
        </form>
      </ComicCard>
    </div>
  );
}
