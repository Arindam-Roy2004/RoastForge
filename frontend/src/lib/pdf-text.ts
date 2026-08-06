// Text-only PDF extraction for the no-account trial roast.
//
// `pdf-edit.ts` also extracts text, but as a side effect of loading a document
// for editing: it rasterizes every page at 2.4x and records a bounding box for
// every glyph, because it needs to draw an overlay and redact regions. The
// trial flow needs none of that — just the words — so this does the cheap half
// of that work. On a typical 2-page resume it's the difference between a few
// megabytes of PNG data and a few kilobytes of string.
//
// Runs entirely in the browser. The file is never uploaded anywhere, which is
// the whole point of the trial: no storage, no cleanup, nothing to leak.

/** Matches the server's TryRoastDto ceiling so we fail fast instead of round-tripping. */
export const TRY_ROAST_MAX_CHARS = 20_000;
/** Matches the server's TryRoastDto floor. */
export const TRY_ROAST_MIN_CHARS = 200;

export class PdfTextError extends Error {}

/**
 * Pulls the visible text out of a PDF, page order preserved.
 *
 * Throws `PdfTextError` with a message written for the user (not a stack trace)
 * whenever the document can't be read or carries no selectable text — the
 * common real-world case being a resume exported as a scanned image.
 */
export async function extractPdfText(file: File): Promise<string> {
  const mupdf = await import("mupdf");

  let doc: ReturnType<typeof mupdf.Document.openDocument>;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    doc = mupdf.Document.openDocument(data, "application/pdf");
  } catch {
    throw new PdfTextError("That file couldn't be opened. Is it a valid PDF?");
  }

  try {
    if (doc.needsPassword()) {
      throw new PdfTextError("That PDF is password protected. Remove the password and try again.");
    }

    const lines: string[] = [];
    let budget = TRY_ROAST_MAX_CHARS;

    const pageCount = doc.countPages();
    for (let p = 0; p < pageCount && budget > 0; p++) {
      const page = doc.loadPage(p);
      const structured = page.toStructuredText("preserve-whitespace");

      // Same walk shape as pdf-edit.ts: MuPDF reports characters, and
      // `beginLine` tells us where to break them. Accumulating per line keeps
      // section headings and bullets on separate rows, which reads better in
      // the prompt than one giant run of text.
      let current = "";
      const flush = () => {
        const trimmed = current.trim();
        if (trimmed) lines.push(trimmed);
        current = "";
      };

      structured.walk({
        beginLine() {
          flush();
        },
        onChar(c: string) {
          current += c;
        },
      });
      flush();

      budget = TRY_ROAST_MAX_CHARS - lines.join("\n").length;
    }

    const text = lines.join("\n").slice(0, TRY_ROAST_MAX_CHARS).trim();

    if (text.length < TRY_ROAST_MIN_CHARS) {
      throw new PdfTextError(
        "We couldn't read enough text from that PDF. Scanned or image-only resumes can't be analysed — export a text-based PDF and try again.",
      );
    }

    return text;
  } finally {
    try {
      (doc as unknown as { destroy?: () => void }).destroy?.();
    } catch {
      /* ignore */
    }
  }
}
