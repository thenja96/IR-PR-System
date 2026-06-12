// Server-side PDF text extraction (unpdf → serverless build of pdf.js).
// Used for annual reports, quarterly reports, investor decks, circulars,
// prospectuses, and sustainability reports. No native dependencies.

export type TextQuality = "ok" | "low" | "none";

export interface PdfExtractionResult {
  text: string;
  pages: number;
  quality: TextQuality;
  /** Title from the PDF's own metadata, when present and meaningful */
  docTitle: string | null;
}

const MAX_EXTRACTED_CHARS = 200_000;
// Below this many characters a "successful" extraction is probably a scanned
// or image-based PDF — flag it so the user knows to paste key sections.
const LOW_QUALITY_THRESHOLD = 800;

export function classifyTextQuality(text: string): TextQuality {
  const length = text.trim().length;
  if (length === 0) return "none";
  return length < LOW_QUALITY_THRESHOLD ? "low" : "ok";
}

/**
 * Extract readable text from a PDF buffer. Throws on parse failure —
 * callers map that to retrieval_status = "extraction_failed".
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<PdfExtractionResult> {
  const { extractText, getDocumentProxy, getMeta } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  let docTitle: string | null = null;
  try {
    const meta = await getMeta(pdf);
    const rawTitle = (meta?.info as Record<string, unknown> | undefined)?.Title;
    if (
      typeof rawTitle === "string" &&
      rawTitle.trim().length > 3 &&
      !/^(untitled|microsoft word|document\d*)/i.test(rawTitle.trim())
    ) {
      docTitle = rawTitle.trim();
    }
  } catch {
    // Metadata is optional — extraction result stands without it.
  }

  const cleaned = (text ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);

  return {
    text: cleaned,
    pages: totalPages,
    quality: classifyTextQuality(cleaned),
    docTitle,
  };
}
