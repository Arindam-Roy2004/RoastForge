// Resume PII editor engine.
//
// Extraction + rendering + true redaction use MuPDF (WASM). Because MuPDF is
// AGPL-3.0, RoastForge as a whole is distributed under AGPL. Replacement text is
// drawn with pdf-lib (standard fonts) since MuPDF.js has no high-level text
// insertion; the original glyphs are genuinely removed by redaction first, so
// edited personal info is not recoverable from the exported file.

type RGB = { r: number; g: number; b: number };

type CharBox = {
  ch: string;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  baseline: number;
  size: number;
  serif: boolean;
  bold: boolean;
  italic: boolean;
  color: RGB;
};

export type PdfLine = {
  pageIndex: number;
  text: string;
  chars: CharBox[];
};

// A real, clickable hyperlink annotation embedded in the PDF (e.g. an icon or
// "My Profile" label that links out even though the visible text isn't a
// URL). Bounds are in PDF points, top-left origin — same space as CharBox.
export type PdfLinkAnnotation = {
  pageIndex: number;
  uri: string;
  x: number;
  top: number;
  width: number;
  height: number;
};

// An editable target: the value region of a line, in PDF points (top-left origin).
export type PdfTextItem = {
  id: string;
  pageIndex: number;
  str: string;
  x: number;
  top: number;
  width: number;
  height: number;
  baseline: number;
  fontSize: number;
  serif: boolean;
  bold: boolean;
  italic: boolean;
  color: RGB;
  bg: RGB;
};

export type PdfPageRender = {
  pageIndex: number;
  dataUrl: string;
  widthPts: number;
  heightPts: number;
  displayScale: number;
  cssWidth: number;
  cssHeight: number;
};

export type LoadedPdf = {
  pages: PdfPageRender[];
  lines: PdfLine[];
  fullText: string;
  linkAnnotations: PdfLinkAnnotation[];
};

export type PdfEdit = {
  item: PdfTextItem;
  newText: string;
};

const RENDER_SCALE = 2.4; // raster resolution
const DISPLAY_SCALE = 1.35; // points -> CSS px for the preview/overlay

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function colorToRGB(c: number[] | undefined): RGB {
  if (!c || c.length === 0) return { r: 0, g: 0, b: 0 };
  if (c.length === 1) {
    const v = Math.round(c[0] * 255);
    return { r: v, g: v, b: v };
  }
  if (c.length >= 4) {
    const [cy, m, y, k] = c;
    return {
      r: Math.round(255 * (1 - cy) * (1 - k)),
      g: Math.round(255 * (1 - m) * (1 - k)),
      b: Math.round(255 * (1 - y) * (1 - k)),
    };
  }
  return { r: Math.round(c[0] * 255), g: Math.round(c[1] * 255), b: Math.round(c[2] * 255) };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function majority(flags: boolean[]): boolean {
  const t = flags.filter(Boolean).length;
  return t * 2 >= flags.length;
}

function averageColor(slice: CharBox[]): RGB {
  if (slice.length === 0) return { r: 0, g: 0, b: 0 };
  let r = 0, g = 0, b = 0;
  for (const c of slice) { r += c.color.r; g += c.color.g; b += c.color.b; }
  return { r: Math.round(r / slice.length), g: Math.round(g / slice.length), b: Math.round(b / slice.length) };
}

export async function loadPdf(file: File): Promise<LoadedPdf> {
  const mupdf = await import("mupdf");
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = mupdf.Document.openDocument(data, "application/pdf");

  const pages: PdfPageRender[] = [];
  const lines: PdfLine[] = [];
  const textChunks: string[] = [];
  const linkAnnotations: PdfLinkAnnotation[] = [];

  const n = doc.countPages();
  for (let p = 0; p < n; p++) {
    const page = doc.loadPage(p);
    const bounds = page.getBounds();
    const widthPts = bounds[2] - bounds[0];
    const heightPts = bounds[3] - bounds[1];

    const pix = page.toPixmap(mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE), mupdf.ColorSpace.DeviceRGB, false);
    const dataUrl = "data:image/png;base64," + bytesToBase64(pix.asPNG());

    pages.push({
      pageIndex: p,
      dataUrl,
      widthPts,
      heightPts,
      displayScale: DISPLAY_SCALE,
      cssWidth: widthPts * DISPLAY_SCALE,
      cssHeight: heightPts * DISPLAY_SCALE,
    });

    // Real clickable link annotations — captures links on text that doesn't
    // look like a URL/keyword at all (icons, "Click here", a plain name).
    try {
      for (const link of page.getLinks()) {
        const uri = link.getURI();
        if (!uri) continue;
        const [x0, y0, x1, y1] = link.getBounds();
        linkAnnotations.push({
          pageIndex: p,
          uri,
          x: Math.min(x0, x1),
          top: Math.min(y0, y1),
          width: Math.abs(x1 - x0),
          height: Math.abs(y1 - y0),
        });
      }
    } catch { /* some PDFs have malformed link dicts — skip them */ }

    const st = page.toStructuredText("preserve-whitespace");
    const lineList: CharBox[][] = [];
    let cur: CharBox[] = [];
    st.walk({
      beginLine() {
        if (cur.length) lineList.push(cur);
        cur = [];
      },
      onChar(c, origin, font, size, quad, color) {
        const xs = [quad[0], quad[2], quad[4], quad[6]];
        const ys = [quad[1], quad[3], quad[5], quad[7]];
        cur.push({
          ch: c,
          x0: Math.min(...xs),
          x1: Math.max(...xs),
          top: Math.min(...ys),
          bottom: Math.max(...ys),
          baseline: origin[1],
          size,
          serif: font.isSerif(),
          bold: font.isBold(),
          italic: font.isItalic(),
          color: colorToRGB(color as unknown as number[]),
        });
      },
    });
    if (cur.length) lineList.push(cur);

    for (const chars of lineList) {
      const text = chars.map((c) => c.ch).join("");
      if (text.trim() === "") continue;
      lines.push({ pageIndex: p, text, chars });
      textChunks.push(text);
    }
  }

  try { (doc as unknown as { destroy?: () => void }).destroy?.(); } catch { /* ignore */ }
  return { pages, lines, fullText: textChunks.join("\n"), linkAnnotations };
}

export function itemToCssBox(item: PdfTextItem, page: PdfPageRender) {
  return {
    left: item.x * page.displayScale,
    top: item.top * page.displayScale,
    width: item.width * page.displayScale,
    height: item.height * page.displayScale,
  };
}

export function rgbCss(c: RGB): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

// Heuristic link/handle detector. Runs alongside the AI-detected values so a
// profile link, portfolio site, or platform handle still becomes editable
// even when the AI missed it, reformatted it, or the detection call failed.
// Label words that precede a profile/social/portfolio link, e.g. "LinkedIn:",
// "GitHub -", "Portfolio", "Profile". Edit this list to teach the detector
// new keywords.
export const LINK_LABEL_KEYWORDS = [
  "linkedin", "github", "gitlab", "leetcode", "codeforces", "codechef",
  "hackerrank", "hackerearth", "kaggle", "twitter", "behance", "dribbble",
  "medium", "stackoverflow", "youtube", "notion", "portfolio", "website", "blog",
  "profile", "profiles", "social", "socials", "links", "contact",
];

// Domains recognized as profile/social/portfolio links even without a label
// or protocol in front of them. Edit this list to teach the detector new
// platforms.
export const LINK_DOMAIN_KEYWORDS = [
  "linkedin.com", "github.com", "gitlab.com", "leetcode.com", "codeforces.com",
  "codechef.com", "hackerrank.com", "hackerearth.com", "kaggle.com",
  "twitter.com", "x.com", "behance.net", "dribbble.com", "medium.com",
  "stackoverflow.com", "youtube.com", "notion.so", "npmjs.com", "replit.com",
  "devpost.com", "itch.io", "angel.co", "wellfound.com", "instagram.com", "dev.to",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LINK_KEYWORDS = LINK_LABEL_KEYWORDS.map(escapeRegExp).join("|");
const KNOWN_LINK_DOMAINS = LINK_DOMAIN_KEYWORDS.map(escapeRegExp).join("|");

const STOP_CHARS = "[^\\s|,;()<>]";

// 1. A URL with an explicit protocol, e.g. "https://github.com/john".
const URL_WITH_PROTOCOL = /https?:\/\/[^\s|,;()<>]+/gi;
// 2. "www.<domain>/<path>" without a protocol.
const URL_WITH_WWW = /www\.[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s|,;()<>]*)?/gi;
// 3. A recognized platform domain, with or without protocol/www, plus path.
const KNOWN_DOMAIN = new RegExp(
  `(?:https?:\\/\\/)?(?:www\\.)?(?:${KNOWN_LINK_DOMAINS})(?:\\/${STOP_CHARS}*)?`,
  "gi",
);
// 4. Whatever value follows a link-related label, e.g. "Portfolio: jane.dev"
//    or "GitHub - johndoe", so generic/unknown domains and bare handles are
//    caught too — not just the platforms in the list above.
// Optional filler word between the keyword and the value, e.g.
// "Codeforces handle: arindam_cf" or "GitHub profile - github.com/john".
const LINK_FILLER_WORDS = "handle|profile|id|username|url|link|account";
const LABELED_HANDLE = new RegExp(
  `(?:${LINK_KEYWORDS})\\s*(?:${LINK_FILLER_WORDS})?\\s*[:\\-]?\\s*(${STOP_CHARS}{2,80})`,
  "gi",
);
// A keyword sitting by itself with no value after it on the line, e.g. a line
// that just says "Profile" or "LinkedIn" — the actual URL usually lives only
// in a hyperlink annotation on that same text, not as visible characters.
const STANDALONE_KEYWORD = new RegExp(`^\\s*(?:${LINK_KEYWORDS})\\s*[:\\-]?\\s*$`, "i");

// Local (no AI) detectors for the other common personal-info fields, so
// email/phone stay editable without sending resume text to a model.
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Matches phone numbers with optional country code, spaces/dots/dashes/parens,
// requiring at least 7 digits total so short numbers (e.g. a year) don't match.
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d[\d\s.-]{6,}\d/g;

function extractLinkCandidates(text: string): string[] {
  const out = new Set<string>();
  const collect = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const raw = (m[1] ?? m[0]).trim().replace(/[.,;:]+$/, "");
      if (raw.length >= 3) out.add(raw);
      if (m[0].length === 0) re.lastIndex += 1; // guard against zero-length match loops
    }
  };
  collect(URL_WITH_PROTOCOL);
  collect(URL_WITH_WWW);
  collect(KNOWN_DOMAIN);
  collect(LABELED_HANDLE);
  if (STANDALONE_KEYWORD.test(text)) out.add(text.trim().replace(/[:\-]+$/, ""));
  return Array.from(out);
}

/** Local (no AI) detector for email + phone number values in a line of text. */
function extractContactCandidates(text: string): string[] {
  const out = new Set<string>();
  const collect = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const raw = m[0].trim();
      const digits = raw.replace(/\D/g, "");
      if (raw.includes("@") || digits.length >= 7) out.add(raw);
    }
  };
  collect(EMAIL_PATTERN);
  collect(PHONE_PATTERN);
  return Array.from(out);
}

function overlaps(a: PdfTextItem, b: PdfTextItem): boolean {
  if (a.pageIndex !== b.pageIndex) return false;
  const ax1 = a.x + a.width;
  const bx1 = b.x + b.width;
  const ay1 = a.top + a.height;
  const by1 = b.top + b.height;
  return a.x < bx1 && b.x < ax1 && a.top < by1 && b.top < ay1;
}

// Locate each detected value inside the extracted lines and return ONLY the
// value's character region (exact bbox from glyph quads). Matching is
// boundary-aware (a value won't match when glued inside a larger token, e.g.
// the LinkedIn handle "arindam-roy" inside "github.com/Arindam-Roy2004") and
// longest-first so the most complete value wins overlapping regions.
export function deriveEditableItems(
  _pages: PdfPageRender[],
  lines: PdfLine[],
  values: string[],
  linkAnnotations: PdfLinkAnnotation[] = [],
): PdfTextItem[] {
  // Fully local detection: a link/handle heuristic plus an email/phone
  // heuristic run over each line's raw text. `values` may still carry
  // externally-supplied values (e.g. a known name) but no AI call is made.
  const heuristicLinks = lines.flatMap((line) => extractLinkCandidates(line.text));
  const heuristicContacts = lines.flatMap((line) => extractContactCandidates(line.text));
  const vals = Array.from(
    new Set(
      [...values, ...heuristicLinks, ...heuristicContacts].map((v) => v.trim()).filter((v) => v.length >= 2),
    ),
  ).sort((a, b) => b.length - a.length);

  // A match glued to a letter/digit is only part of a larger token → reject it
  // (e.g. LinkedIn "arindam-roy" inside "github.com/Arindam-Roy2004").
  const isAlnum = (ch: string | undefined) => ch !== undefined && /[A-Za-z0-9]/.test(ch);

  const out: PdfTextItem[] = [];
  let counter = 0;

  for (const line of lines) {
    const chars = line.chars;
    // Whitespace-stripped, lowercased form so values match even when the PDF
    // renders word gaps without space glyphs ("Arindam Roy" -> "ArindamRoy").
    let compact = "";
    const compactToChar: number[] = [];
    for (let k = 0; k < chars.length; k++) {
      for (const cp of chars[k].ch) {
        if (/\s/.test(cp)) continue;
        compact += cp.toLowerCase();
        compactToChar.push(k);
      }
    }

    for (const v of vals) {
      const cv = v.toLowerCase().replace(/\s+/g, "");
      if (cv.length < 2) continue;
      let from = 0;
      while (from <= compact.length) {
        const idx = compact.indexOf(cv, from);
        if (idx < 0) break;
        const end = idx + cv.length;
        from = idx + cv.length;

        const before = idx > 0 ? compact[idx - 1] : undefined;
        const after = end < compact.length ? compact[end] : undefined;
        if (isAlnum(before) || isAlnum(after)) continue;

        const kStart = compactToChar[idx];
        const kEnd = compactToChar[end - 1];
        if (kStart === undefined || kEnd === undefined) continue;
        const slice = chars.slice(kStart, kEnd + 1);
        if (slice.length === 0) continue;

        const x0 = Math.min(...slice.map((c) => c.x0));
        const x1 = Math.max(...slice.map((c) => c.x1));
        const top = Math.min(...slice.map((c) => c.top));
        const bottom = Math.max(...slice.map((c) => c.bottom));

        const item: PdfTextItem = {
          id: `e${counter++}`,
          pageIndex: line.pageIndex,
          str: chars.slice(kStart, kEnd + 1).map((c) => c.ch).join(""),
          x: x0,
          top,
          width: x1 - x0,
          height: bottom - top,
          baseline: median(slice.map((c) => c.baseline)),
          fontSize: median(slice.map((c) => c.size)),
          serif: majority(slice.map((c) => c.serif)),
          bold: majority(slice.map((c) => c.bold)),
          italic: majority(slice.map((c) => c.italic)),
          color: averageColor(slice),
          bg: { r: 255, g: 255, b: 255 },
        };

        if (!out.some((e) => overlaps(e, item))) out.push(item);
      }
    }
  }

  // Real hyperlink annotations: highlight whatever text sits under the link,
  // regardless of what it says (an icon caption, "Click here", a bare name).
  // This catches links the keyword/URL heuristics above can't, since the
  // visible text carries no clue that it's a link at all.
  for (const link of linkAnnotations) {
    const rectLeft = link.x;
    const rectRight = link.x + link.width;
    const rectTop = link.top;
    const rectBottom = link.top + link.height;

    const covered = lines
      .filter((l) => l.pageIndex === link.pageIndex)
      .flatMap((l) => l.chars)
      .filter((c) => {
        const cx = (c.x0 + c.x1) / 2;
        const cy = (c.top + c.bottom) / 2;
        return cx >= rectLeft && cx <= rectRight && cy >= rectTop && cy <= rectBottom;
      });

    // Build the highlighted region from the covered glyphs when there are
    // any (keeps the box tight to the actual text); otherwise fall back to
    // the annotation's own rect so an icon-only link is still clickable.
    const x0 = covered.length ? Math.min(...covered.map((c) => c.x0)) : rectLeft;
    const x1 = covered.length ? Math.max(...covered.map((c) => c.x1)) : rectRight;
    const top = covered.length ? Math.min(...covered.map((c) => c.top)) : rectTop;
    const bottom = covered.length ? Math.max(...covered.map((c) => c.bottom)) : rectBottom;

    const item: PdfTextItem = {
      id: `e${counter++}`,
      pageIndex: link.pageIndex,
      str: covered.length ? covered.map((c) => c.ch).join("") : link.uri,
      x: x0,
      top,
      width: Math.max(x1 - x0, 4),
      height: Math.max(bottom - top, 4),
      baseline: covered.length ? median(covered.map((c) => c.baseline)) : bottom,
      fontSize: covered.length ? median(covered.map((c) => c.size)) : link.height,
      serif: covered.length ? majority(covered.map((c) => c.serif)) : false,
      bold: covered.length ? majority(covered.map((c) => c.bold)) : false,
      italic: covered.length ? majority(covered.map((c) => c.italic)) : false,
      color: covered.length ? averageColor(covered) : { r: 0, g: 0, b: 0 },
      bg: { r: 255, g: 255, b: 255 },
    };

    if (!out.some((e) => overlaps(e, item))) out.push(item);
  }

  return out;
}

const UNICODE_TO_ASCII: Record<string, string> = {
  "\u2013": "-", "\u2014": "-", "\u2212": "-",
  "\u2018": "'", "\u2019": "'", "\u201A": ",",
  "\u201C": '"', "\u201D": '"',
  "\u2022": "-", "\u2026": "...", "\u00A0": " ",
};

function sanitizeForWinAnsi(s: string): string {
  let out = "";
  for (const ch of s) {
    if (UNICODE_TO_ASCII[ch] !== undefined) { out += UNICODE_TO_ASCII[ch]; continue; }
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x20 && code <= 0x7e) out += ch;
    else if (code >= 0xa1 && code <= 0xff) out += ch;
  }
  return out;
}

// True redaction with MuPDF (removes the original glyphs), then draw the
// replacement text with pdf-lib at the same position/size/color.
export async function buildEditedPdf(file: File, edits: PdfEdit[]): Promise<Uint8Array> {
  const mupdf = await import("mupdf");
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = mupdf.Document.openDocument(data, "application/pdf");
  const pdf = doc.asPDF();
  if (!pdf) throw new Error("Not a PDF document");

  const byPage = new Map<number, PdfEdit[]>();
  for (const e of edits) {
    const list = byPage.get(e.item.pageIndex) ?? [];
    list.push(e);
    byPage.set(e.item.pageIndex, list);
  }

  for (const [pageIndex, pageEdits] of byPage) {
    const page = pdf.loadPage(pageIndex) as import("mupdf").PDFPage;
    for (const { item } of pageEdits) {
      const annot = page.createAnnotation("Redact");
      // Exact glyph box — no padding, so neighboring glyphs aren't clipped.
      annot.setRect([item.x, item.top, item.x + item.width, item.top + item.height]);
    }
    // black_boxes=false (remove, don't paint black), images untouched, line-art
    // untouched (so the resume's rule lines / vector graphics don't shift or
    // disappear), text removed.
    page.applyRedactions(
      false,
      mupdf.PDFPage.REDACT_IMAGE_NONE,
      mupdf.PDFPage.REDACT_LINE_ART_NONE,
      mupdf.PDFPage.REDACT_TEXT_REMOVE,
    );
  }

  const redactedBytes = pdf.saveToBuffer("garbage=compact").asUint8Array();
  try { (doc as unknown as { destroy?: () => void }).destroy?.(); } catch { /* ignore */ }

  // Insert replacement text with pdf-lib.
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const outDoc = await PDFDocument.load(redactedBytes, { ignoreEncryption: true });
  const pages = outDoc.getPages();

  type StdFont = Awaited<ReturnType<typeof outDoc.embedFont>>;
  const fontCache = new Map<string, StdFont>();
  async function getFont(serif: boolean, bold: boolean, italic: boolean): Promise<StdFont> {
    const key = `${serif ? "t" : "h"}${bold ? "b" : ""}${italic ? "i" : ""}`;
    const cached = fontCache.get(key);
    if (cached) return cached;
    let name: (typeof StandardFonts)[keyof typeof StandardFonts];
    if (serif) {
      name = bold && italic ? StandardFonts.TimesRomanBoldItalic
        : bold ? StandardFonts.TimesRomanBold
        : italic ? StandardFonts.TimesRomanItalic
        : StandardFonts.TimesRoman;
    } else {
      name = bold && italic ? StandardFonts.HelveticaBoldOblique
        : bold ? StandardFonts.HelveticaBold
        : italic ? StandardFonts.HelveticaOblique
        : StandardFonts.Helvetica;
    }
    const f = await outDoc.embedFont(name);
    fontCache.set(key, f);
    return f;
  }

  for (const { item, newText } of edits) {
    const page = pages[item.pageIndex];
    if (!page) continue;
    const text = sanitizeForWinAnsi(newText.trim());
    if (!text) continue;

    const font = await getFont(item.serif, item.bold, item.italic);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const y = pageHeight - item.baseline; // top-left baseline -> bottom-left origin

    let size = item.fontSize;
    let tw = font.widthOfTextAtSize(text, size);
    if (tw > item.width && tw > 0) {
      size = Math.max(4, (size * item.width) / tw);
      tw = font.widthOfTextAtSize(text, size);
    }

    // Values in the right half of the page are right-aligned to the margin, so
    // anchor the replacement to the original right edge instead of the left.
    const originalRight = item.x + item.width;
    const rightAligned = item.x > pageWidth * 0.45;
    const drawX = rightAligned ? Math.max(0, originalRight - tw) : item.x;

    const color = rgb(item.color.r / 255, item.color.g / 255, item.color.b / 255);
    try {
      page.drawText(text, { x: drawX, y, size, font, color });
    } catch {
      const ascii = text.replace(/[^\x20-\x7e]/g, "");
      if (ascii) {
        try { page.drawText(ascii, { x: drawX, y, size, font, color }); } catch { /* skip */ }
      }
    }
  }

  return outDoc.save();
}
