"use client";
import { AuthProvider } from "@/store/auth";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors theme="dark" position="top-center" closeButton />
    </AuthProvider>
  );
}
