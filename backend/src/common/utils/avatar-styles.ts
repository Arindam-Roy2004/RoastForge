/**
 * DiceBear 9.x avatar styles we expose in the UI.
 * Mirrors the list offered on https://www.dicebear.com/playground/.
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

/** Allowed values for the DiceBear `rotate` query param (we expose quarter turns). */
export const AVATAR_ROTATES = [0, 90, 180, 270] as const;
export type AvatarRotate = (typeof AVATAR_ROTATES)[number];

/** Whole-number range (inclusive) we allow for `radius` and `scale`. */
export const AVATAR_RADIUS_MIN = 0;
export const AVATAR_RADIUS_MAX = 50;
export const AVATAR_SCALE_MIN = 50;
export const AVATAR_SCALE_MAX = 200;
