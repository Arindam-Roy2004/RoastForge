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

// Muted, slightly earthy tints (dusty rose, straw, mist, sage, heather, clay,
// celadon, blush) so the avatar tiles sit on the linen page like printed
// cards instead of candy swatches.
const BG_COLORS = [
  "bg-[#ecd6cf]",
  "bg-[#efe3c2]",
  "bg-[#d3dee3]",
  "bg-[#d6e2cf]",
  "bg-[#ddd8e4]",
  "bg-[#eed7c2]",
  "bg-[#cfe2db]",
  "bg-[#ead3d3]",
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

/**
 * Card colours a post can store, as the hex that goes in `avatarBackgroundColor`
 * and the class that paints it. Same palette as `BG_COLORS`, in the same order,
 * so a stored colour and a derived one look identical. The hex values are the
 * stored keys from the original Tailwind palette and must not change; only the
 * class that paints them does.
 */
const CARD_COLORS: { hex: string; className: (typeof BG_COLORS)[number] }[] = [
  { hex: "fbcfe8", className: "bg-[#ecd6cf]" },
  { hex: "fef08a", className: "bg-[#efe3c2]" },
  { hex: "bfdbfe", className: "bg-[#d3dee3]" },
  { hex: "bbf7d0", className: "bg-[#d6e2cf]" },
  { hex: "e9d5ff", className: "bg-[#ddd8e4]" },
  { hex: "fed7aa", className: "bg-[#eed7c2]" },
  { hex: "99f6e4", className: "bg-[#cfe2db]" },
  { hex: "fecdd3", className: "bg-[#ead3d3]" },
];

/** A card colour for a new post. Stored per post, so each post gets its own. */
export function randomCardColorHex(): string {
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)].hex;
}

/**
 * The class that fills a post's card.
 *
 * A post that stored a palette colour uses it. Anything older (no colour, or the
 * lavender that used to be baked into every avatar) falls back to the colour
 * derived from its seed, which is what those cards have always shown.
 */
export function getPostCardBg(storedHex: string | null | undefined, seed: string): string {
  const match = CARD_COLORS.find((c) => c.hex === storedHex?.toLowerCase());
  return match ? match.className : getCardBg(seed);
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
