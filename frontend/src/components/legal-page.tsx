import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export type LegalSection = {
  /** URL fragment, so every section can be linked to directly. */
  id: string;
  title: string;
  body: ReactNode;
};

/**
 * Shell for Privacy and Terms, following the shape of Vercel's own legal pages:
 * a title and effective date, an "On this page" contents list, then sections
 * that can each be deep-linked.
 *
 * Layout is the app's own — centred masthead like Projects and Create a post,
 * and the same `rounded-xl` card shell for the draft notice and contents.
 *
 * On wide screens the contents list sits in a sticky left column; below `lg` it
 * sits above the text, so it never squeezes the reading column on a phone.
 *
 * The draft notice should stay until the text has been reviewed. The pages
 * describe what the code actually does, but they are not legal advice.
 */
export function LegalPage({
  title,
  effective,
  sections,
}: {
  title: string;
  /** ISO date, e.g. "2026-09-28". Formatted with Intl, not by hand. */
  effective: string;
  sections: LegalSection[];
}) {
  // Rendered on the server only (no hydration), and pinned to UTC so the day
  // can't shift for a reader west of Greenwich.
  const effectiveLabel = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${effective}T00:00:00Z`));

  return (
    <article className="flex w-full flex-col gap-8">
      <header className="text-center">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Effective <time dateTime={effective}>{effectiveLabel}</time>
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        {/* Contents. Sticky on desktop; `top-24` clears the floating navbar. */}
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-xs)]">
            <p className="mb-3 text-xs font-medium text-foreground">On this page</p>
            <ol className="space-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 max-w-2xl space-y-10">
          <div
            role="note"
            className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-foreground">
              <span className="font-medium">Draft.</span> This page describes how{" "}
              <span translate="no">RoastForge</span> works today but has not been reviewed by a lawyer.
              Replace it with reviewed text before relying on it.
            </p>
          </div>

          {/* Prose styles scoped here instead of adding a typography plugin. */}
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              // Clears the floating navbar when jumped to from the contents.
              className="scroll-mt-24 space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:rounded-sm [&_a]:text-primary-strong [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-ring/45 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:space-y-2"
            >
              <h2
                id={`${s.id}-title`}
                className="font-sans text-base font-semibold tracking-tight text-balance text-foreground"
              >
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
