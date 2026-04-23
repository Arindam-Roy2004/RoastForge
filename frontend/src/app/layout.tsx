import type { Metadata } from "next";
import { body, display, mono } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import { themeInitScript } from "@/store/theme";
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
      className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint to set the `dark` class from localStorage or
            system preference. Prevents a flash of the wrong theme on load. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
