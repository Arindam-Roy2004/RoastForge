"use client";

import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ComicCard } from "./comic-card";
import Link from "next/link";
import { AiFillFire, AiOutlineComment, AiOutlineLike } from "react-icons/ai";
import { FaCalendar } from "react-icons/fa";

type ResumeCardProps = {
  id: string;
  version: number;
  status: string;
  overall?: number;
  createdAt?: string;
  candidateAlias?: string;
};

export function ResumeCard({ id, version, status, overall, createdAt, candidateAlias }: ResumeCardProps) {
  return (
    <Link href={`/resume/${id}`} className="block h-full">
      <ComicCard className="h-full cursor-pointer comic-lift" variant="default" shadow="medium">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full comic-border-2 bg-teal flex items-center justify-center text-lg font-bold shrink-0">
            {candidateAlias?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(display.className, "text-base truncate")}>
              {candidateAlias || `Resume v${version}`}
            </p>
            <p className={cn(body.className, "text-sm text-[#2c2c2c]/70 line-clamp-2")}>
              Version {version} &middot; {status}
            </p>
            {createdAt && (
              <span className="flex items-center gap-1 text-xs text-[#2c2c2c]/50 mt-1">
                <FaCalendar className="text-[10px]" />
                {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {overall != null && (
            <span
              className={cn(
                display.className,
                "flex items-center gap-1 rounded-full comic-border-2 bg-green-400 px-3 py-1 text-xs comic-shadow-2 comic-lift text-[#2c2c2c]",
              )}
            >
              <AiOutlineLike /> Score {overall}
            </span>
          )}
          <span
            className={cn(
              display.className,
              "flex items-center gap-1 rounded-full comic-border-2 bg-cyan-400 px-3 py-1 text-xs comic-shadow-2 comic-lift text-[#2c2c2c]",
            )}
          >
            <AiOutlineComment /> Thread
          </span>
          <span
            className={cn(
              display.className,
              "flex items-center gap-1 rounded-full comic-border-2 bg-orange-400 px-3 py-1 text-xs comic-shadow-2 comic-lift text-[#2c2c2c] ml-auto",
            )}
          >
            <AiFillFire /> Roast!
          </span>
        </div>
      </ComicCard>
    </Link>
  );
}
