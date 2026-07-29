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
      <Card className="h-full min-h-[13rem] cursor-pointer border border-border rounded-lg shadow-[var(--shadow-sm)] bg-card flex flex-col hover:bg-muted/30 transition-colors duration-200">
        <div className="p-4 flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-full border border-border bg-primary/20 flex items-center justify-center text-lg font-heading uppercase shrink-0 shadow-[var(--shadow-2xs)]">
              {candidateAlias?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading uppercase text-base line-clamp-2 leading-tight tracking-wide mb-1">
                {title || candidateAlias || `Resume v${version}`}
              </h3>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="secondary" className="border border-border rounded-md font-bold uppercase py-0 px-2 text-[10px] shadow-[var(--shadow-2xs)] bg-card">
                  v{version}
                </Badge>
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-muted/40 px-4 py-2.5 flex items-center justify-between mt-auto">
          {createdAt ? (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          ) : <span />}
          <div className="flex items-center gap-3">
            {overall != null ? (
              <Badge className="border border-border shadow-[var(--shadow-2xs)] font-heading text-xs rounded-md bg-primary text-primary-foreground">
                AI Score: {overall}
              </Badge>
            ) : (
              <Badge variant="outline" className="border border-border shadow-[var(--shadow-2xs)] font-heading text-[10px] rounded-md text-muted-foreground uppercase">
                Unscored
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
