"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { User } from "@/lib/api";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { GradientAvatar } from "@/components/gradient-avatar";
import { CommentIcon, OverviewIcon, ResumeIcon, ShieldCheckIcon, UsersIcon } from "@/components/icons/pika";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { UsersPanel } from "@/components/admin/users-panel";
import { CommentsPanel, ResumesPanel } from "@/components/admin/content-panels";

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
} as const;

const TABS = [
  { value: "overview", label: "Overview", icon: OverviewIcon, Panel: OverviewPanel },
  { value: "members", label: "Members", icon: UsersIcon, Panel: UsersPanel },
  { value: "resumes", label: "Resumes", icon: ResumeIcon, Panel: ResumesPanel },
  { value: "comments", label: "Comments", icon: CommentIcon, Panel: CommentsPanel },
] as const;

/**
 * Admin profile. The role is said once, in words, in the identity line; the
 * shield on the avatar carries it at a glance. The avatar's conic ring is drawn
 * from the chart ramp (pine, river, ochre), so the account reads as distinct
 * without bringing in a new colour.
 */
function AdminMasthead({ user }: { user: User }) {
  return (
    <motion.header variants={itemVariants} className="flex min-w-0 items-center gap-4">
      <div className="relative shrink-0">
        <div className="rounded-full bg-[conic-gradient(from_210deg,hsl(var(--chart-1)),hsl(var(--chart-3)),hsl(var(--chart-4)),hsl(var(--chart-1)))] p-[2px] shadow-[var(--shadow-sm)]">
          <GradientAvatar
            seed={user.id}
            initial={user.name.charAt(0).toUpperCase() || "?"}
            className="size-14 border-2 border-background text-lg"
          />
        </div>
        <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-[var(--shadow-xs)]">
          <ShieldCheckIcon className="size-4" />
        </span>
      </div>
      <div className="min-w-0">
        <h1 className="truncate font-sans text-2xl font-semibold tracking-tight text-foreground">{user.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
          <span className="font-medium text-primary-strong">Administrator</span>
          <span aria-hidden className="hidden opacity-50 sm:inline">/</span>
          <span className="break-all">{user.email}</span>
          {user.anonymousUsername && (
            <>
              <span aria-hidden className="hidden opacity-50 sm:inline">/</span>
              <span className="font-mono text-xs">u/{user.anonymousUsername}</span>
            </>
          )}
        </p>
      </div>
    </motion.header>
  );
}

export default function AdminPage() {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6 py-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-[60px] rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-96 max-w-full rounded-lg" />
        <Skeleton className="h-[104px] rounded-xl border border-foreground/12" />
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-[268px] rounded-xl border border-foreground/12 lg:col-span-3" />
          <Skeleton className="h-[268px] rounded-xl border border-foreground/12 lg:col-span-2" />
        </div>
      </div>
    );
  }

  // useRequireAuth has already scheduled the redirect to /login.
  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  // Cosmetic gate only: every /api/admin route re-checks the flag server-side.
  if (!user.isAdmin) {
    return (
      <div className="flex items-center justify-center p-4 py-16">
        <Card className="flex w-full max-w-md flex-col items-center rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-md)]">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-border bg-muted shadow-[var(--shadow-xs)]">
            <ShieldCheckIcon className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="mb-6 font-sans text-2xl font-semibold">Admins only</CardTitle>
          <Button variant="outline" className="h-11 w-full" render={<Link href="/" />} nativeButton={false}>
            Back to hub
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="flex w-full min-w-0 flex-col gap-7 py-8"
    >
      <AdminMasthead user={user} />

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="overview" className="gap-5">
          <TabsList aria-label="Admin sections">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTab key={value} value={value}>
                <Icon aria-hidden /> {label}
              </TabsTab>
            ))}
          </TabsList>
          {TABS.map(({ value, Panel }) => (
            <TabsPanel key={value} value={value}>
              <Panel />
            </TabsPanel>
          ))}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
