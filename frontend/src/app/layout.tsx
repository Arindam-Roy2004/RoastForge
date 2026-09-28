import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { Analytics } from "@vercel/analytics/next";
import { body, display, mono } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import { CookieNotice } from "@/components/cookie-notice";
import { themeInitScript } from "@/store/theme";
import "./globals.css";

export const metadata: Metadata = {
  // Resolves relative URLs (the generated og:image, canonical links) to the
  // real domain. Without it social cards get a localhost or relative image URL
  // that no crawler can fetch.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // Pages that set their own `title` get the brand suffix automatically.
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

// Browser chrome colour on mobile, following the theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
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
          <CookieNotice />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
