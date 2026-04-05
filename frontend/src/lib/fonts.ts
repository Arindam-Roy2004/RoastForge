import { Bangers, Kalam } from "next/font/google";

export const display = Bangers({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const body = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});
