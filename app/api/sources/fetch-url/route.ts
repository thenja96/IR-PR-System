// Server-side URL fetch + preview for the Source Intelligence Centre.
// Fetches the page on the server (never from the browser), extracts a readable
// title and text, classifies the trust tier, and returns a PREVIEW ONLY —
// nothing is saved until the user confirms via /api/sources/import.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromHtml } from "@/lib/sources/extract";
import { classifyTextQuality, extractPdfText } from "@/lib/sources/extract-pdf";
import {
  classifyTrustTier,
  isOfficialTier1Domain,
  suggestDocumentType,
} from "@/lib/sources/trust-tier";

export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_PDF_BYTES = 15_000_000;
const MAX_EXTRACTED_CHARS = 150_000;
const PREVIEW_CHARS = 1_500;

// Basic SSRF guard: public http(s) URLs only, no private/internal hosts.
function validateUrl(raw: string): { url: URL } | { error: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: "Invalid URL. Paste a full link starting with https://" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { error: "Only http(s) URLs are supported." };
  }
  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.startsWith("[");
  if (isPrivate) {
    return { error: "This URL points to a private or internal address and cannot be fetched." };
  }
  return { url };
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = (await request.json()) as { url?: string };
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "Missing URL." }, { status: 400 });
    }

    const validated = validateUrl(body.url);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const { url } = validated;
    const domain = url.hostname.toLowerCase().replace(/^www\./, "");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AegisMarketPulse/1.0; +source-intelligence)",
          Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        },
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        {
          error: aborted
            ? "The page took too long to respond (15s timeout). Try again or paste the text manually."
            : "Could not reach this URL. Check the link, or paste the text manually.",
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `The site responded with HTTP ${response.status}. The page may be blocked or removed — paste the text manually if needed.` },
        { status: 502 }
      );
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const isPdf = contentType.includes("application/pdf") || url.pathname.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      // Phase 3B: extract PDF text server-side (annual/quarterly reports,
      // decks, circulars, prospectuses, sustainability reports).
      const fileName = decodeURIComponent(url.pathname.split("/").pop() ?? "document.pdf");
      const fallbackTitle =
        fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "PDF document";
      const classification = classifyTrustTier({ url: url.toString(), domain });
      const base = {
        url: url.toString(),
        domain,
        contentType: "pdf" as const,
        title: fallbackTitle,
        trustTier: classification.tier,
        trustTierReason: classification.reason,
        suggestedDocumentType: suggestDocumentType(url.toString(), domain),
        author: null,
        publication: null,
        language: null,
        isOfficialTier1: isOfficialTier1Domain(domain),
      };

      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > MAX_PDF_BYTES) {
        return NextResponse.json({
          ...base,
          textPreview: "",
          extractedText: "",
          textLength: 0,
          pages: 0,
          textQuality: "none",
          manualFallbackNeeded: true,
          retrievalStatus: "link_only",
          note: `This PDF is too large to extract (${Math.round(contentLength / 1_000_000)} MB, limit 15 MB). The link will be saved — paste the key sections manually so the AI can analyse and cite them.`,
        });
      }

      let buffer: ArrayBuffer;
      try {
        buffer = await response.arrayBuffer();
      } catch {
        return NextResponse.json({
          ...base,
          textPreview: "",
          extractedText: "",
          textLength: 0,
          pages: 0,
          textQuality: "none",
          manualFallbackNeeded: true,
          retrievalStatus: "link_only",
          note: "The PDF could not be downloaded fully. The link will be saved — paste the key sections manually.",
        });
      }
      if (buffer.byteLength > MAX_PDF_BYTES) {
        return NextResponse.json({
          ...base,
          textPreview: "",
          extractedText: "",
          textLength: 0,
          pages: 0,
          textQuality: "none",
          manualFallbackNeeded: true,
          retrievalStatus: "link_only",
          note: "This PDF exceeds the 15 MB extraction limit. The link will be saved — paste the key sections manually.",
        });
      }

      try {
        const extraction = await extractPdfText(buffer);
        if (extraction.quality === "none") {
          return NextResponse.json({
            ...base,
            textPreview: "",
            extractedText: "",
            textLength: 0,
            pages: extraction.pages,
            textQuality: "none",
            manualFallbackNeeded: true,
            retrievalStatus: "link_only",
            note: "No selectable text found — this is likely a scanned or image-based PDF. The link will be saved; paste the key sections manually so the AI can analyse and cite them.",
          });
        }
        return NextResponse.json({
          ...base,
          textPreview: extraction.text.slice(0, PREVIEW_CHARS),
          extractedText: extraction.text,
          textLength: extraction.text.length,
          pages: extraction.pages,
          textQuality: extraction.quality,
          manualFallbackNeeded: false,
          retrievalStatus: "text_extracted",
          note:
            extraction.quality === "low"
              ? `Only ${extraction.text.length.toLocaleString()} characters were extracted from ${extraction.pages} pages — the PDF may be mostly scanned images. Review the preview and paste missing sections before saving.`
              : null,
        });
      } catch (err) {
        console.error("PDF extraction failed:", err);
        return NextResponse.json({
          ...base,
          textPreview: "",
          extractedText: "",
          textLength: 0,
          pages: 0,
          textQuality: "none",
          manualFallbackNeeded: true,
          retrievalStatus: "extraction_failed",
          note: "PDF text extraction failed (the file may be corrupted or protected). The link will be saved — paste the key sections manually.",
        });
      }
    }

    let html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      html = html.slice(0, MAX_HTML_BYTES);
    }

    const extracted = extractFromHtml(html);
    const text = extracted.text.slice(0, MAX_EXTRACTED_CHARS);
    const classification = classifyTrustTier({ url: url.toString(), domain });
    const isOfficialTier1 = isOfficialTier1Domain(domain);
    const htmlBase = {
      url: url.toString(),
      domain,
      contentType: "html" as const,
      title: extracted.title,
      trustTier: classification.tier,
      trustTierReason: classification.reason,
      suggestedDocumentType: suggestDocumentType(url.toString(), domain),
      author: extracted.author,
      publication: extracted.publication,
      language: extracted.language,
      isOfficialTier1,
      pages: 0,
    };

    if (text.trim().length < 80) {
      // JavaScript-rendered (common for Bursa announcement pages) or paywalled.
      // Not an error: return a manual-fallback preview so the user can paste
      // the text while keeping the official URL, title, and trust tier.
      return NextResponse.json({
        ...htmlBase,
        textPreview: "",
        extractedText: "",
        textLength: 0,
        textQuality: "none",
        manualFallbackNeeded: true,
        retrievalStatus: isOfficialTier1 ? "manual_with_official_url" : "link_only",
        note: isOfficialTier1
          ? "This Bursa Malaysia page is JavaScript-rendered, so the announcement text could not be captured automatically. Paste the announcement text below — the official URL and Tier 1 classification will be kept."
          : "Very little readable text was found (the page may be JavaScript-rendered or behind a paywall). Paste the text below, or save the link only.",
      });
    }

    const textQuality = classifyTextQuality(text);
    return NextResponse.json({
      ...htmlBase,
      textPreview: text.slice(0, PREVIEW_CHARS),
      extractedText: text,
      textLength: text.length,
      textQuality,
      manualFallbackNeeded: false,
      retrievalStatus: "text_extracted",
      note:
        textQuality === "low"
          ? "Only a small amount of text was captured — review the preview and add missing sections before saving."
          : null,
    });
  } catch (err) {
    console.error("fetch-url error:", err);
    return NextResponse.json(
      { error: "URL fetch failed unexpectedly." },
      { status: 500 }
    );
  }
}
