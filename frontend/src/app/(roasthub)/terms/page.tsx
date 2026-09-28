import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for using RoastForge.",
  alternates: { canonical: "/terms" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "using",
    title: "Using RoastForge",
    body: (
      <p>
        <span translate="no">RoastForge</span> lets you post a resume, get AI and community feedback on
        it, and, if you choose, be found by recruiters. By using the site you agree to these terms.
      </p>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <ul>
        <li>You keep ownership of the resumes, comments and projects you post.</li>
        <li>
          By posting, you let <span translate="no">RoastForge</span> display that content on the site
          and process it to generate feedback.
        </li>
        <li>
          Only post a resume you have the right to share. Remove other people&apos;s personal details,
          and your own if you don&apos;t want them public, before posting.
        </li>
      </ul>
    ),
  },
  {
    id: "conduct",
    title: "Be decent",
    body: (
      <p>
        Roasts are about the resume, not the person. Don&apos;t post harassment, hate speech, threats or
        anyone&apos;s private information, and don&apos;t spam or try to get around the site&apos;s rate
        limits. We may remove content or suspend accounts that break these rules.
      </p>
    ),
  },
  {
    id: "ai-feedback",
    title: "AI feedback",
    body: (
      <p>
        AI roasts and scores are generated automatically. They can be wrong, and they are entertainment
        and general feedback, not professional career advice.
      </p>
    ),
  },
  {
    id: "no-guarantees",
    title: "No guarantees",
    body: (
      <p>
        <span translate="no">RoastForge</span> is provided as is. We don&apos;t guarantee the site will
        always be available, or that using it will lead to interviews or a job.
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    body: (
      <p>
        How we handle your data is explained in the <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: <p>We may update these terms. The date at the top of this page shows when they last changed.</p>,
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of service" effective="2026-09-28" sections={SECTIONS} />;
}
