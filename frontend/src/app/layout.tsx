import type { Metadata } from "next";
import { Chakra_Petch, Russo_One } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-chakra",
});

const russoOne = Russo_One({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-russo",
});

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
      className={`${chakraPetch.variable} ${russoOne.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
