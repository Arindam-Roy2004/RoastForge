"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Successfully logged in");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-16">
      <Card className="w-full max-w-md border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
        <CardHeader className="text-center space-y-2 p-8 pb-4">
          <div className="mx-auto bg-primary w-12 h-12 flex items-center justify-center rounded-full border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-2">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-heading uppercase">Welcome Back</CardTitle>
          <CardDescription>Access your portal. Step back into the forge and face the heat.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="font-heading uppercase text-xs">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <label className="font-heading uppercase text-xs">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none"
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full border-4 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all rounded-none font-heading text-lg"
              data-testid="button-submit-login"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <div className="flex justify-center border-t-4 border-border bg-muted p-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-heading uppercase text-primary hover:underline tracking-wider" data-testid="link-go-register">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
