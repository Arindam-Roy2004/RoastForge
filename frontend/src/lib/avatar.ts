/**
 * DiceBear 9.x avatar styles exposed in the playground-style picker.
 * See https://www.dicebear.com/playground/ for the full catalogue.
 */
export const AVATAR_STYLES = [
  "adventurer",
  "adventurer-neutral",
  "avataaars",
  "avataaars-neutral",
  "big-ears",
  "big-ears-neutral",
  "big-smile",
  "bottts",
  "bottts-neutral",
  "croodles",
  "croodles-neutral",
  "dylan",
  "fun-emoji",
  "glass",
  "icons",
  "identicon",
  "initials",
  "lorelei",
  "lorelei-neutral",
  "micah",
  "miniavs",
  "notionists",
  "notionists-neutral",
  "open-peeps",
  "personas",
  "pixel-art",
  "pixel-art-neutral",
  "rings",
  "shapes",
  "thumbs",
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

/** Human-friendly label for the style pill in the picker. */
export function formatStyleLabel(style: AvatarStyle): string {
  return style
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const BG_COLORS = [
  "bg-pink-200",
  "bg-yellow-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-purple-200",
  "bg-orange-200",
  "bg-teal-200",
  "bg-rose-200",
] as const;

function sumSeed(seed: string): number {
  return Math.abs([...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0));
}

export function getLegacyAvatarStyle(seed: string): AvatarStyle {
  return AVATAR_STYLES[sumSeed(seed) % AVATAR_STYLES.length];
}

export function getCardBg(seed: string): string {
  return BG_COLORS[sumSeed(seed) % BG_COLORS.length];
}

export function randomAvatarSeed(): string {
  const part = () => Math.random().toString(36).slice(2, 10);
  return `${part()}${part()}`.slice(0, 120);
}

// ─── Customisation options (mirror of backend validator ranges) ──────────────

export const AVATAR_ROTATES = [0, 90, 180, 270] as const;
export type AvatarRotate = (typeof AVATAR_ROTATES)[number];

export const AVATAR_RADIUS_CHOICES = [0, 10, 25, 50] as const;
export const AVATAR_SCALE_CHOICES = [70, 85, 100, 115, 130] as const;

/** Playground-style presets for DiceBear `backgroundColor`. */
export const AVATAR_BG_PRESETS: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Transparent", value: "transparent" },
  { label: "Sky", value: "b6e3f4" },
  { label: "Lavender", value: "c0aede" },
  { label: "Periwinkle", value: "d1d4f9" },
  { label: "Blush", value: "ffd5dc" },
  { label: "Mint", value: "d4f4dd" },
  { label: "Peach", value: "ffdfba" },
];

/** All tweakable DiceBear options we expose. Keep in sync with backend DTO. */
export type AvatarOptions = {
  backgroundColor?: string | null;
  flip?: boolean;
  rotate?: number;
  radius?: number;
  scale?: number;
};

/**
 * Builds a DiceBear 9.x HTTP API URL.
 * See https://www.dicebear.com/how-to-use/http-api/.
 */
export function getDiceBearUrl(
  seed: string,
  style?: AvatarStyle,
  size = 200,
  options: AvatarOptions = {},
): string {
  const resolvedStyle = style ?? getLegacyAvatarStyle(seed);
  const params = new URLSearchParams();
  params.set("seed", seed);
  if (size) params.set("size", String(size));

  const bg = options.backgroundColor;
  if (bg === "transparent") params.set("backgroundColor", "transparent");
  else if (bg && /^[a-fA-F0-9]{6}$/.test(bg)) params.set("backgroundColor", bg);

  if (options.flip) params.set("flip", "true");
  if (options.rotate && options.rotate > 0 && options.rotate < 360) {
    params.set("rotate", String(options.rotate));
  }
  if (options.radius && options.radius > 0) params.set("radius", String(options.radius));
  if (options.scale && options.scale !== 100) params.set("scale", String(options.scale));

  return `https://api.dicebear.com/9.x/${resolvedStyle}/svg?${params.toString()}`;
}
