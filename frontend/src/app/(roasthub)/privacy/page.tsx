import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What RoastForge collects and who it is shared with.",
  alternates: { canonical: "/privacy" },
};

const CONTACT_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdIqU2QCmm7VMje1JWvpOm39tDHXv4QcwDvGzI9j1U54vcGYA/viewform?usp=publish-editor";

// Each statement matches what the code does. Update this page when that changes.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="2026-09-28">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your name, email, and profile picture from Google sign-in. We never see your password.</li>
          <li>Resumes you post, with their title, description, and card style.</li>
          <li>Comments, reactions, and projects.</li>
          <li>Optional profile details: display name, LinkedIn, GitHub, target role, skills.</li>
        </ul>
      </section>

      <section>
        <h2>What is public</h2>
        <p>
          Posted resumes are public and shown under your anonymous username. Recruiters see your real
          name only if you turn on <strong>Share identity with recruiters</strong>.
        </p>
      </section>

      <section>
        <h2>Trial roasts</h2>
        <p>
          The <a href="/try">trial</a> reads your PDF in the browser. Only the text is sent for
          analysis, and nothing is stored.
        </p>
      </section>

      <section>
        <h2>Services we use</h2>
        <ul>
          <li>
            <strong>Google Gemini</strong> for AI roasts
          </li>
          <li>
            <strong>Cloudinary</strong> for PDF storage
          </li>
          <li>
            <strong>MongoDB</strong> for accounts and posts
          </li>
          <li>
            <strong>Upstash</strong> for rate limiting
          </li>
          <li>
            <strong>Vercel</strong> for hosting and cookie-free analytics
          </li>
        </ul>
        <p>We don&apos;t sell your data or use it for ads.</p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          One cookie keeps you signed in. It can&apos;t be read by scripts and expires after
          7&nbsp;days. Local storage holds your theme and a short-lived sign-in token. Nothing is used
          for tracking.
        </p>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          Delete your account from your profile. This removes your profile, resumes, projects,
          comments, and reactions. Uploaded PDF files may remain in storage.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions or removal requests:{" "}
          <a href={CONTACT_FORM} target="_blank" rel="noopener noreferrer">
            contact form
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
