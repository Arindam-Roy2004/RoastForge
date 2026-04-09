"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "recruiter">("user");
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
      toast.success(res.message);
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-16">
      <Card className="w-full max-w-md border-[3px] border-border rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
        <CardHeader className="text-center space-y-2 p-8 pb-4">
          <div className="mx-auto bg-primary w-12 h-12 flex items-center justify-center rounded-full border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-2">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-heading uppercase tracking-tighter font-black">Join the Forge</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Candidate or recruiter? Choose your weapon and build your profile.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Name</label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">I am a</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={role === "user" ? "default" : "outline"}
                  onClick={() => setRole("user")}
                  className={`flex-1 border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-10 ${role === "user" ? "" : "bg-muted"}`}
                >
                  Candidate
                </Button>
                <Button
                  type="button"
                  variant={role === "recruiter" ? "default" : "outline"}
                  onClick={() => setRole("recruiter")}
                  className={`flex-1 border-[3px] border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading uppercase text-xs h-10 ${role === "recruiter" ? "" : "bg-muted"}`}
                >
                  Recruiter
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full border-[3px] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading uppercase text-lg h-12 tracking-wide"
            >
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <div className="flex justify-center border-t-[3px] border-border bg-muted p-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="cursor-pointer font-heading uppercase text-primary hover:underline tracking-wider" data-testid="link-go-login">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
