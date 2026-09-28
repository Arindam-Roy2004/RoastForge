import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for using RoastForge.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="2026-09-28">
      <section>
        <p>By using RoastForge, you agree to these terms.</p>
      </section>

      <section>
        <h2>Your content</h2>
        <ul>
          <li>You own what you post.</li>
          <li>You let us display it and use it to generate feedback.</li>
          <li>Only post resumes you have the right to share.</li>
        </ul>
      </section>

      <section>
        <h2>Conduct</h2>
        <p>
          Roast the resume, not the person. No harassment, hate speech, spam, or sharing other
          people&apos;s personal information. We can remove content and suspend accounts that break
          these rules.
        </p>
      </section>

      <section>
        <h2>AI feedback</h2>
        <p>AI scores and roasts can be wrong. They are not professional career advice.</p>
      </section>

      <section>
        <h2>No guarantees</h2>
        <p>
          The service is provided as is. We don&apos;t guarantee uptime, interviews, or job offers.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms. The date above shows the latest version. See also our{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
