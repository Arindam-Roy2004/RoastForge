import { Russo_One, Chakra_Petch } from "next/font/google";

export const display = Russo_One({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const body = Chakra_Petch({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
