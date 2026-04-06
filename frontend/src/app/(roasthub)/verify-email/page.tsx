"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) { setStatus("err"); setMsg("Missing token"); return; }
    (async () => {
      try {
        const res = await apiFetch("/api/auth/verify-email/" + encodeURIComponent(token), { auth: false });
        setStatus("ok");
        setMsg(res.message);
      } catch (e) {
        setStatus("err");
        setMsg(e instanceof Error ? e.message : "Verification failed");
      }
    })();
  }, [token]);

  return (
    <div className="flex items-center justify-center py-16 p-4">
      <Card className="w-full max-w-md border-4 border-border rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center p-8 bg-card">
        <CardTitle className="font-heading uppercase text-3xl mb-4">Email Verification</CardTitle>
        <CardDescription className="mb-2 text-base font-medium">
          {status === "idle" && "Confirming your token..."}
          {status === "ok" && "You can sign in now!"}
          {status === "err" && "Something went wrong."}
        </CardDescription>
        <p className={cn("text-sm font-bold uppercase tracking-wider mb-6", status === "err" ? "text-destructive" : "text-green-600")}>
          {msg}
        </p>
        <Link href="/login">
          <Button className="border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all w-full font-heading uppercase text-lg h-12">
            Go to Sign In
          </Button>
        </Link>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32 text-muted-foreground font-heading uppercase tracking-widest text-xl">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
