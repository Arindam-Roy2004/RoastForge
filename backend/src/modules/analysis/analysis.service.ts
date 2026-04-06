import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERDICT_DIMENSIONS, type VerdictBar } from "./verdict-dimensions.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_KEY! });

const analysisDir = dirname(fileURLToPath(import.meta.url));

function loadSystemInstruction(): string {
  return readFileSync(join(analysisDir, "roast-system-prompt.txt"), "utf8");
}

export interface RoastResult {
  score: number;
  roastText: string;
  verdictBars: VerdictBar[];
}

function clampBarScore(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 3;
  return Math.max(1, Math.min(5, Math.round(x)));
}

function verdictBarsFromRaw(raw: Record<string, unknown>): VerdictBar[] {
  const vs = raw.verdictScores;
  if (vs && typeof vs === "object" && !Array.isArray(vs)) {
    const obj = vs as Record<string, unknown>;
    return VERDICT_DIMENSIONS.map(({ id, label }) => ({
      id,
      label,
      score: clampBarScore(obj[id]),
    }));
  }

  const vb = raw.verdictBars;
  if (Array.isArray(vb)) {
    const byId = new Map<string, number>();
    for (const row of vb) {
      if (row && typeof row === "object" && "id" in row && "score" in row) {
        byId.set(String((row as { id: string }).id), clampBarScore((row as { score: unknown }).score));
      }
    }
    if (byId.size > 0) {
      return VERDICT_DIMENSIONS.map(({ id, label }) => ({
        id,
        label,
        score: byId.get(id) ?? 3,
      }));
    }
  }

  return VERDICT_DIMENSIONS.map(({ id, label }) => ({ id, label, score: 3 }));
}

/** Clamp model output so UI cards stay a predictable size. */
export function normalizeRoastResult(raw: unknown): RoastResult {
  const o = raw as Record<string, unknown>;
  let score = Number(o?.score);
  if (!Number.isFinite(score)) score = 50;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let roastText = typeof o?.roastText === "string" ? o.roastText.trim() : "";
  if (roastText.length > 900) roastText = `${roastText.slice(0, 897).trim()}…`;

  const verdictBars = verdictBarsFromRaw(o);

  return { score, roastText, verdictBars };
}

export const generateResumeRoast = async (resumeText: string): Promise<RoastResult> => {
  const userPrompt = `Analyze the following resume text. Follow the OUTPUT FORMAT in your system instructions exactly.

Resume Text:
${resumeText}`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: loadSystemInstruction(),
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini AI");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  return normalizeRoastResult(parsed);
};
