// Server-side PDF text extraction (unpdf → serverless build of pdf.js).
// Used for annual reports, quarterly reports, investor decks, circulars,
// prospectuses, and sustainability reports. No native dependencies.

export type TextQuality = "ok" | "low" | "none";

export interface PdfExtractionResult {
  text: string;
  pages: number;
  quality: TextQuality;
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
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  const cleaned = (text ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);

  return {
    text: cleaned,
    pages: totalPages,
    quality: classifyTextQuality(cleaned),
  };
}
