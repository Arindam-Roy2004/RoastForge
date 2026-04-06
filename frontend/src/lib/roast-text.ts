/** Turn model roast copy into short bullets for fixed-height UI. */
export function roastVerdictBullets(roastText: string): string[] {
  if (!roastText?.trim()) return [];
  const t = roastText.trim();
  if (t.includes("|")) {
    return t
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }
  const paras = t
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (paras.length >= 2) return paras.slice(0, 5);
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}
