export type VerdictBar = { id: string; label: string; score: number };

export const VERDICT_DIMENSIONS: Omit<VerdictBar, "score">[] = [
  { id: "metricsImpact", label: "Metrics & impact" },
  { id: "verbStrength", label: "Verb strength & ownership" },
  { id: "technicalSignal", label: "Technical signal" },
  { id: "structureClarity", label: "Structure & clarity" },
  { id: "roleFit", label: "Role fit & focus" },
];

/** 1 = rough, 5 = strong — neo-brutalist fills */
export function verdictBarFillClass(score: number): string {
  const s = Math.max(1, Math.min(5, Math.round(score)));
  const map: Record<number, string> = {
    1: "bg-red-600",
    2: "bg-orange-500",
    3: "bg-amber-400",
    4: "bg-lime-500",
    5: "bg-emerald-600",
  };
  return map[s] ?? "bg-amber-400";
}

export function coalesceVerdictBars(bars: VerdictBar[] | undefined | null): VerdictBar[] {
  if (bars && bars.length === 5) return bars;
  return VERDICT_DIMENSIONS.map((d) => ({ ...d, score: 3 }));
}

/** Only then show AI result UI (avoids empty circle / placeholder bars when DB has partial aiRoast). */
export function isCompleteRoastPayload(
  data: { score?: unknown; roastText?: unknown; verdictBars?: unknown } | null | undefined,
): boolean {
  if (!data || typeof data !== "object") return false;
  const score = (data as { score?: unknown }).score;
  if (typeof score !== "number" || Number.isNaN(score)) return false;
  const text = typeof (data as { roastText?: unknown }).roastText === "string" ? (data as { roastText: string }).roastText.trim() : "";
  if (text.length < 4) return false;
  const bars = (data as { verdictBars?: unknown }).verdictBars;
  if (!Array.isArray(bars) || bars.length < 5) return false;
  return bars.slice(0, 5).every((b) => {
    if (!b || typeof b !== "object") return false;
    const s = (b as { score?: unknown }).score;
    return typeof s === "number" && !Number.isNaN(s) && s >= 1 && s <= 5;
  });
}
