import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

export const display = localFont({
  src: "../fonts/heming-variable.ttf",
  variable: "--font-heming",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const body = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

/** Monospace from the Geist family — even metrics, pairs with Heming for UI chrome. */
export const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
