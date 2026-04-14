import { Geist } from "next/font/google";
import localFont from "next/font/local";

export const display = localFont({
  src: "../fonts/heming-variable.ttf",
  variable: "--font-heming",
  display: "swap",
});

export const body = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
