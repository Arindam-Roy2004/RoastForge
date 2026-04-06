/** Ordered dimensions for the 5-bar verdict UI (ids must match AI JSON keys). */
export const VERDICT_DIMENSIONS = [
  { id: "metricsImpact", label: "Metrics & impact" },
  { id: "verbStrength", label: "Verb strength & ownership" },
  { id: "technicalSignal", label: "Technical signal" },
  { id: "structureClarity", label: "Structure & clarity" },
  { id: "roleFit", label: "Role fit & focus" },
] as const;

export type VerdictDimensionId = (typeof VERDICT_DIMENSIONS)[number]["id"];

export type VerdictBar = {
  id: string;
  label: string;
  score: number;
};
