import { body, display } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type React from "react";

const variants: Record<string, string> = {
  default: "bg-[#F2D5A3]",
  cream: "bg-[#EFD7B7]",
  peach: "bg-[#F8E4C6]",
  yellow: "bg-[#F2D5A3]",
  light: "bg-[#EBDDBF]",
  teal: "bg-[#97D4D5]",
  gradient: "bg-gradient-to-r from-[#F2D5A3] to-[#F8E4C6]",
};

const shadows: Record<string, string> = {
  small: "comic-shadow-3",
  medium: "comic-shadow-6",
  large: "comic-shadow-8",
};

const fontMap: Record<string, string> = {
  body: body.className,
  display: display.className,
  none: "",
};

export function ComicCard({
  children,
  className,
  variant = "default",
  fontStyle = "body",
  shadow = "medium",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variants;
  fontStyle?: "body" | "display" | "none";
  shadow?: "small" | "medium" | "large";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl comic-border p-4 sm:p-6",
        variants[variant],
        shadows[shadow],
        fontMap[fontStyle],
        className,
      )}
    >
      {children}
    </div>
  );
}
