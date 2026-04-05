"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ComicCard } from "@/components/comic-card";
import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

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
    <div className="flex items-center justify-center py-16">
      <ComicCard variant="teal" shadow="large" className="text-center max-w-md">
        <h1 className={cn(display.className, "text-3xl mb-2")}>Email Verification</h1>
        <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 mb-4")}>
          {status === "idle" && "Confirming your token..."}
          {status === "ok" && "You can sign in now!"}
          {status === "err" && "Something went wrong."}
        </p>
        <p className={cn(body.className, "text-sm mb-4")}>{msg}</p>
        <Link href="/login" className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-base")}>
          Go to Sign In
        </Link>
      </ComicCard>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32 text-[#2c2c2c]/50">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
