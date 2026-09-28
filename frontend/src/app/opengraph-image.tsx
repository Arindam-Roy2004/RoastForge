import { ImageResponse } from "next/og";
import { BRAND_TEAL, FLAME_PATH, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

// Social preview for links shared on X, LinkedIn, Slack, Discord and iMessage.
// 1200x630 is the size every major platform crops to without letterboxing.
// X uses this too: the `summary_large_image` card in the root metadata falls
// back to og:image, so no separate twitter-image file is needed.
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#F9F6F1",
          color: "#2B303B",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: BRAND_TEAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d={FLAME_PATH} />
            </svg>
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2.5 }}>
            Find your resume&apos;s brutal truth
          </div>
          <div style={{ fontSize: 32, color: "#5B6372" }}>
            AI roasts, community feedback, and recruiters who find you.
          </div>
        </div>

        <div style={{ display: "flex", height: 8, width: 160, borderRadius: 4, background: BRAND_TEAL }} />
      </div>
    ),
    size,
  );
}
