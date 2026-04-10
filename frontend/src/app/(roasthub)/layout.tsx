import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type React from "react";

export default function RoastHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(body.className, "flex min-h-screen flex-col")}>
      <Navbar />
      <main className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
