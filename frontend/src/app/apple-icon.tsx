import { ImageResponse } from "next/og";
import { BRAND_TEAL, FLAME_PATH } from "@/lib/site";

// iOS home-screen icon. iOS ignores SVG favicons, so it needs a PNG; this renders
// the same mark as `icon.svg` at Apple's size. iOS applies its own corner mask,
// so the tile is square here.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_TEAL,
        }}
      >
        <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d={FLAME_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
