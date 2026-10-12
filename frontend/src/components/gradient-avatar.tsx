import { cn } from "@/lib/utils";

// Tailwind 500-level colour pairs. Inline hex rather than utility classes so the
// colours can be picked at runtime without the classes being purged.
const GRADIENTS = [
  ["#f43f5e", "#f97316"], // rose → orange
  ["#f97316", "#eab308"], // orange → yellow
  ["#22c55e", "#14b8a6"], // green → teal
  ["#14b8a6", "#06b6d4"], // teal → cyan
  ["#0ea5e9", "#6366f1"], // sky → indigo
  ["#6366f1", "#a855f7"], // indigo → purple
  ["#a855f7", "#ec4899"], // purple → pink
  ["#ec4899", "#f43f5e"], // pink → rose
] as const;

// FNV-1a. Spreads similar ids (Mongo ObjectIds share long prefixes) across the
// palette, which a plain char-code sum would not.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Round profile image: a gradient chosen from the seed, with the user's initial.
 * Seed it with the user's id so the same person looks the same on every screen.
 * Size comes from `className` (e.g. "size-10 text-sm").
 */
export function GradientAvatar({
  seed,
  initial,
  className,
}: {
  seed: string;
  initial: string;
  className?: string;
}) {
  const h = hashSeed(seed || "anonymous");
  const [from, to] = GRADIENTS[h % GRADIENTS.length];
  const angle = 120 + ((h >>> 8) % 4) * 30;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full border border-border font-mono font-bold uppercase text-white",
        className,
      )}
      style={{ backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` }}
    >
      {initial}
    </div>
  );
}
