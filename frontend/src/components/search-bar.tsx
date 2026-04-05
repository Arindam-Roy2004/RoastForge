"use client";

import { body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { FaSearch } from "react-icons/fa";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search resumes...",
}: {
  value: string;
  onChange: (q: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2c2c2c]/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          body.className,
          "w-full rounded-full comic-border bg-[#F8E4C6] pl-10 pr-4 py-3 text-base comic-shadow-3 focus:outline-none focus:bg-white transition-colors",
        )}
      />
    </div>
  );
}
