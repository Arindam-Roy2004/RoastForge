import type { ReactNode } from "react";

/**
 * Shell for Privacy and Terms: centred title and date, then short sections.
 *
 * Deliberately plain. These pages are a few paragraphs long, so a contents list
 * just repeated every heading a second time above the text.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** ISO date, e.g. "2026-09-28". */
  updated: string;
  children: ReactNode;
}) {
  // Server-rendered only, and pinned to UTC so the day can't shift by timezone.
  const updatedLabel = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${updated}T00:00:00Z`));

  return (
    <article className="mx-auto w-full max-w-2xl">
      <header className="mb-10 text-center">
        <h1 className="font-sans text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Updated <time dateTime={updated}>{updatedLabel}</time>
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_a]:rounded-sm [&_a]:text-primary-strong [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-ring/45 [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
