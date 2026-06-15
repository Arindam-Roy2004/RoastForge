import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  // Fail build early when the public API URL is missing in prod so we don't ship a broken app.
  throw new Error("NEXT_PUBLIC_API_URL must be set in production.");
}

const SECURITY_HEADERS = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Google Identity Services opens a consent popup and posts the credential
  // back via window.postMessage. A stricter `same-origin` COOP blocks that
  // call (you'll see "Cross-Origin-Opener-Policy policy would block the
  // window.postMessage call" in the console). `same-origin-allow-popups`
  // keeps cross-origin isolation for same-origin windows but lets popups
  // we opened talk back — exactly what GSI needs.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // MuPDF's WASM glue imports Node's `module` on a Node-only branch.
      // Alias it to a browser stub so the client bundle resolves.
      module: { browser: "./src/lib/empty-module.js" },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
