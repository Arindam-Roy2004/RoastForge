"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Flame, MessageSquare, ThumbsUp, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ResumeCardProps = {
  id: string;
  title?: string;
  version: number;
  status: string;
  overall?: number;
  createdAt?: string;
  candidateAlias?: string;
};

export function ResumeCard({ id, title, version, status, overall, createdAt, candidateAlias }: ResumeCardProps) {
  return (
    <Link href={`/resume/${id}`} className="block h-full">
      <Card className="h-full cursor-pointer border-4 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all bg-card p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-border bg-primary/20 flex items-center justify-center text-xl font-heading uppercase shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {candidateAlias?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading uppercase text-lg line-clamp-2 leading-tight">
              {title || candidateAlias || `Resume v${version}`}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2 font-medium">
              Version {version} &middot; <span className="capitalize">{status}</span>
            </p>
            {createdAt && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/80 mt-1 uppercase font-bold tracking-wider">
                <Calendar className="w-3 h-3" />
                {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {overall != null && (
            <Badge variant="default" className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none font-bold uppercase gap-1 bg-green-400 text-black">
              <ThumbsUp className="w-3 h-3" /> Score {overall}
            </Badge>
          )}
          <Badge variant="secondary" className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none font-bold uppercase gap-1">
            <MessageSquare className="w-3 h-3" /> Thread
          </Badge>
          <Badge variant="default" className="ml-auto border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none font-bold uppercase gap-1 bg-orange-400 text-black hover:bg-orange-500">
            <Flame className="w-3 h-3 text-red-600" /> Roast!
          </Badge>
        </div>
      </Card>
    </Link>
  );
}
