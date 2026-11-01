"use client";

import { useState, type ReactNode } from "react";
import { Loader2, XIcon } from "lucide-react";
import { adminApi, type AdminUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GradientAvatar } from "@/components/gradient-avatar";
import { Dialog, DialogClose, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { LockIcon, ShieldCheckIcon, TrashIcon, UnlockIcon } from "@/components/icons/pika";
import {
  ADMIN_INPUT,
  AdminTag,
  MICRO_LABEL,
  SegmentedControl,
  StatusLabel,
  formatDate,
  runAdminAction,
  useAdminQuery,
} from "./admin-kit";

type Pending = null | "role" | "access" | "delete";

const ROLES: { value: AdminUser["role"]; label: string }[] = [
  { value: "user", label: "Candidate" },
  { value: "recruiter", label: "Recruiter" },
];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2.5 ring-1 ring-foreground/8">
      <dt className={MICRO_LABEL}>{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground tabular-nums">{children}</dd>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <h3 className={MICRO_LABEL}>{title}</h3>
      {children}
    </section>
  );
}

/**
 * Slide-over for one account. Stays mounted while it slides out, so `user`
 * is kept by the caller after close; the body is keyed on the id so opening
 * another account starts from clean form state.
 */
export function ManageUserSheet({
  user,
  open,
  onOpenChange,
  onChanged,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `removed` is true when the account was deleted. */
  onChanged: (removed: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <SheetContent>
        {user && (
          <SheetBody
            key={user.id}
            user={user}
            onBusyChange={setBusy}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Dialog>
  );
}

function SheetBody({
  user,
  onBusyChange,
  onChanged,
  onClose,
}: {
  user: AdminUser;
  onBusyChange: (busy: boolean) => void;
  onChanged: (removed: boolean) => void;
  onClose: () => void;
}) {
  // Local copy so the sheet reflects each change without waiting for the list.
  const [current, setCurrent] = useState(user);
  const [pending, setPendingState] = useState<Pending>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  const detail = useAdminQuery(`user|${user.id}`, () => adminApi.user(user.id));
  const counts = detail.data?.counts;

  const setPending = (p: Pending) => {
    setPendingState(p);
    onBusyChange(p !== null);
  };

  async function apply(kind: Exclude<Pending, null>, action: () => Promise<boolean>) {
    setPending(kind);
    const ok = await action();
    setPending(null);
    return ok;
  }

  const changeRole = (role: AdminUser["role"]) => {
    if (role === current.role) return;
    void apply("role", () =>
      runAdminAction(async () => {
        const res = await adminApi.updateUser(current.id, { role });
        if (res.data) setCurrent(res.data);
        onChanged(false);
      }, "Role updated"),
    );
  };

  const toggleAccess = () => {
    const suspended = !current.suspendedAt;
    void apply("access", () =>
      runAdminAction(async () => {
        const res = await adminApi.updateUser(current.id, { suspended });
        if (res.data) setCurrent(res.data);
        onChanged(false);
      }, suspended ? "Member suspended" : "Member reinstated"),
    );
  };

  const remove = async () => {
    const ok = await apply("delete", () =>
      runAdminAction(() => adminApi.deleteUser(current.id, confirmEmail.trim()), "Account deleted"),
    );
    if (ok) {
      onChanged(true);
      onClose();
    }
  };

  const emailMatches = confirmEmail.trim().toLowerCase() === current.email.toLowerCase();
  const name = current.name || `u/${current.anonymousUsername}`;
  const count = (n: number | undefined) =>
    n !== undefined ? n.toLocaleString() : detail.error ? "—" : <Skeleton className="h-4 w-8" />;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-foreground/8 px-5">
        <GradientAvatar seed={current.id} initial={name.charAt(0).toUpperCase()} className="size-9 border-0 text-xs" />
        <div className="min-w-0 flex-1">
          <DialogTitle className="flex items-center gap-1.5 font-sans text-sm font-semibold tracking-tight">
            <span className="truncate">{name}</span>
            {current.isAdmin && <AdminTag />}
          </DialogTitle>
          <DialogDescription className="truncate text-xs">{current.email}</DialogDescription>
        </div>
        <DialogClose
          disabled={pending !== null}
          render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}
        >
          <XIcon />
        </DialogClose>
      </header>

      <div className="flex-1 space-y-7 overflow-y-auto overscroll-y-contain p-5">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Fact label="Status">
            <StatusLabel suspendedAt={current.suspendedAt} />
          </Fact>
          <Fact label="Joined">{formatDate(current.createdAt)}</Fact>
          <Fact label="Talent">{current.role === "recruiter" ? "—" : current.talentComposite.toFixed(1)}</Fact>
          <Fact label="Resumes">{count(counts?.resumes)}</Fact>
          <Fact label="Comments">{count(counts?.comments)}</Fact>
          <Fact label="Projects">{count(counts?.projects)}</Fact>
        </dl>

        <Section title="Identity">
          <dl className="divide-y divide-foreground/8 rounded-lg ring-1 ring-foreground/8">
            {[
              ["Alias", current.anonymousUsername ? `u/${current.anonymousUsername}` : "—"],
              ["Account ID", current.id],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate font-mono text-xs text-foreground select-all">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {current.isAdmin ? (
          <p className="flex items-start gap-2.5 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground ring-1 ring-primary/15">
            <ShieldCheckIcon className="mt-px size-4 shrink-0 text-primary-strong" />
            Admin accounts are managed from the CLI.
          </p>
        ) : (
          <>
            <Section title="Role">
              <div className="flex items-center gap-3">
                <SegmentedControl
                  value={current.role}
                  onChange={changeRole}
                  options={ROLES}
                  label="Role"
                  disabled={pending !== null}
                />
                {pending === "role" && (
                  <Loader2 aria-label="Saving" className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </Section>

            <Section title="Access">
              <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 ring-1 ring-foreground/8">
                <p className="text-xs text-muted-foreground">
                  {current.suspendedAt
                    ? `Suspended ${formatDate(current.suspendedAt)}.`
                    : "Signs them out everywhere and blocks sign-in."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAccess}
                  disabled={pending !== null}
                  className={cn("shrink-0", !current.suspendedAt && "text-destructive")}
                >
                  {pending === "access" ? (
                    <Loader2 className="animate-spin" />
                  ) : current.suspendedAt ? (
                    <UnlockIcon />
                  ) : (
                    <LockIcon />
                  )}
                  {current.suspendedAt ? "Reinstate" : "Suspend"}
                </Button>
              </div>
            </Section>

            <Section title="Danger zone">
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (emailMatches && !pending) void remove();
                }}
                className="space-y-2.5 rounded-lg bg-destructive/[0.04] p-3 ring-1 ring-destructive/25"
              >
                <label htmlFor="confirm-delete" className="block text-xs text-muted-foreground">
                  Type <span className="font-mono text-foreground select-all">{current.email}</span> to delete this
                  account and everything it owns.
                </label>
                <div className="flex gap-2">
                  <Input
                    id="confirm-delete"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={pending !== null}
                    className={cn(ADMIN_INPUT, "h-9 bg-card")}
                  />
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    disabled={!emailMatches || pending !== null}
                    className="h-9 shrink-0"
                  >
                    {pending === "delete" ? <Loader2 className="animate-spin" /> : <TrashIcon />}
                    Delete
                  </Button>
                </div>
              </form>
            </Section>
          </>
        )}
      </div>
    </>
  );
}
