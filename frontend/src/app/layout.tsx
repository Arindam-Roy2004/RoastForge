import type { Metadata } from "next";
import { body, display } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoastForge — Resume Roasting & Talent Discovery",
  description:
    "Upload resumes for AI analysis, get community feedback, showcase projects, and let recruiters discover high-signal candidates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
