"use client";
import { AuthProvider } from "@/store/auth";
import { ThemeProvider, useTheme } from "@/store/theme";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

// `NEXT_PUBLIC_GOOGLE_CLIENT_ID` must match the backend's `GOOGLE_CLIENT_ID`.
// In dev a missing value is a warning (not crash) so unrelated UI work isn't blocked
// when env files aren't filled in yet — the actual sign-in button will simply error.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

if (!GOOGLE_CLIENT_ID && typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google sign-in will not work.");
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors theme={theme} position="top-center" closeButton />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          {children}
          <ThemedToaster />
        </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
