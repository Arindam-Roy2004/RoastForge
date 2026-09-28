import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What RoastForge collects, why, and who it is shared with.",
  alternates: { canonical: "/privacy" },
};

const CONTACT_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdIqU2QCmm7VMje1JWvpOm39tDHXv4QcwDvGzI9j1U54vcGYA/viewform?usp=publish-editor";

// Every statement below was checked against the code at the time of writing.
// If you change what the app stores or sends, update this page with it.
const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <ul>
        <li>
          <strong>Your Google account basics.</strong> When you sign in with Google we receive your
          name, email address and profile picture. We don&apos;t receive or store a password.
        </li>
        <li>
          <strong>Resumes you post.</strong> The PDF file, plus the title, description and card style
          you choose. You can edit personal details out of the PDF before posting.
        </li>
        <li>
          <strong>Your activity.</strong> Comments, likes, dislikes and votes, and any projects you add
          to your profile.
        </li>
        <li>
          <strong>Optional profile details.</strong> Display name, LinkedIn and GitHub links, target
          role and skills, if you add them.
        </li>
      </ul>
    ),
  },
  {
    id: "what-is-public",
    title: "What is public",
    body: (
      <p>
        Posted resumes are public: anyone can view them, and they appear in the gallery under your
        anonymous username. Your real name is not shown next to them. If you turn on{" "}
        <strong>Share identity with recruiters</strong>, signed-in recruiters can see your name and
        profile links; with it off, they only see your anonymous alias.
      </p>
    ),
  },
  {
    id: "trial",
    title: "The no-account trial",
    body: (
      <p>
        On the <a href="/try">trial page</a> your PDF is read in your browser, and only the extracted
        text is sent for analysis. The file isn&apos;t uploaded or stored, and the result is gone when
        you leave the page.
      </p>
    ),
  },
  {
    id: "services",
    title: "Services we share data with",
    body: (
      <>
        <ul>
          <li>
            <strong translate="no">Google Gemini</strong> — the text of your resume is sent for the AI
            roast.
          </li>
          <li>
            <strong translate="no">Cloudinary</strong> — stores the PDF files you post.
          </li>
          <li>
            <strong translate="no">MongoDB</strong> — stores your account, posts and activity.
          </li>
          <li>
            <strong translate="no">Upstash</strong> — rate limiting, to stop abuse. It sees request
            counts, not your content.
          </li>
          <li>
            <strong translate="no">Vercel</strong> — hosts the site and provides page analytics that
            don&apos;t use cookies.
          </li>
          <li>
            <strong translate="no">Google Sign-In</strong> — handles your login.
          </li>
        </ul>
        <p>We don&apos;t sell your data or use it for advertising.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & local storage",
    body: (
      <p>
        We set one cookie, <strong translate="no">refreshToken</strong>, which keeps you signed in. It
        is <strong>HttpOnly</strong>, so page scripts can&apos;t read it, and it expires after 7&nbsp;days.
        Your browser&apos;s local storage also holds your theme choice, a short-lived sign-in token, and
        reactions waiting to sync if you went offline. None of these are used for tracking.
      </p>
    ),
  },
  {
    id: "deleting",
    title: "Deleting your data",
    body: (
      <p>
        You can delete your account from your profile page. That removes your profile, resumes,
        projects, comments, likes and votes from our database. Copies of uploaded PDF files may remain
        in file storage after deletion.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        For questions about your data, or to ask for it to be removed, use the{" "}
        <a href={CONTACT_FORM} target="_blank" rel="noopener noreferrer">
          contact form
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" effective="2026-09-28" sections={SECTIONS} />;
}
