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

/** Pull the filename out of a Content-Disposition header, if any. */
function filenameFromDisposition(disposition: string): string | null {
  if (!disposition) return null;
  const star = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].replace(/["']/g, "").trim());
    } catch {
      /* fall through */
    }
  }
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain?.[1]?.trim() || null;
}

/** Turn a filename like "CHINHIN-AnnualReport2025.pdf" into a readable title. */
function cleanFileTitle(name: string | null | undefined): string | null {
  if (!name) return null;
  const cleaned = name
    .replace(/\.(pdf|aspx?)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 1 ? cleaned : null;
}

/**
 * Classify a PDF report from filename / PDF metadata / leading text.
 * Report PDFs never default to media_article — "other" is the fallback.
 */
function detectPdfDocumentType(haystackRaw: string): string {
  const haystack = haystackRaw.toLowerCase();
  if (/annual\s*report|laporan\s*tahunan/.test(haystack)) return "annual_report";
  if (/quarter|interim|q[1-4]\s*(fy)?\s*20\d{2}|unaudited.*(results|financial)/.test(haystack))
    return "quarterly_report";
  if (/presentation|investor\s*deck|corporate\s*deck|briefing\s*deck/.test(haystack))
    return "investor_deck";
  if (/press\s*release|media\s*release/.test(haystack)) return "press_release";
  if (/announcement/.test(haystack)) return "bursa_announcement";
  // Circulars, prospectuses, sustainability reports have no dedicated type yet.
  return "other";
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
      // Official Tier 1 domains (Bursa, SC, BNM) often block automated
      // fetches (403). That is NOT a broken link: return a manual-fallback
      // preview that preserves the official URL, domain, and Tier 1 tier so
      // the user can paste the announcement text. No bypassing is attempted.
      if (isOfficialTier1Domain(domain) && [401, 403, 406].includes(response.status)) {
        const classification = classifyTrustTier({ url: url.toString(), domain });
        const isBursa = domain === "bursamalaysia.com" || domain.endsWith(".bursamalaysia.com");
        return NextResponse.json({
          url: url.toString(),
          domain,
          contentType: "html" as const,
          title: isBursa ? "Bursa Malaysia announcement" : "Official disclosure page",
          trustTier: classification.tier,
          trustTierReason: classification.reason,
          suggestedDocumentType: isBursa
            ? "bursa_announcement"
            : suggestDocumentType(url.toString(), domain),
          author: null,
          publication: null,
          language: null,
          isOfficialTier1: true,
          thirdPartyWarning: null,
          pages: 0,
          textPreview: "",
          extractedText: "",
          textLength: 0,
          textQuality: "none" as const,
          manualFallbackNeeded: true,
          fetchBlocked: true,
          retrievalStatus: "manual_with_official_url",
          note: "Bursa Malaysia may block automated text extraction for this page. The URL will be preserved as an official Tier 1 source. Please paste the announcement text below so AI can analyse and cite it.",
          debug: {
            detectedContentType: "(blocked before content)",
            contentDisposition: "(none)",
            finalUrl: url.toString(),
            magicBytesPdf: false,
            extractionStatus: `blocked_http_${response.status}`,
            extractedTextLength: 0,
            pageCount: 0,
            extractionError: null,
          },
        });
      }
      return NextResponse.json(
        { error: `The site responded with HTTP ${response.status}. The page may be blocked or removed — paste the text manually if needed.` },
        { status: 502 }
      );
    }

    // ── Content inspection ───────────────────────────────────
    // Detect PDFs by (in order of authority): body magic bytes (%PDF-),
    // Content-Type, Content-Disposition filename, URL ending in .pdf, and
    // known report-download patterns (e.g. GetReport.aspx) that return PDFs.
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const contentDisposition = response.headers.get("content-disposition") ?? "";
    const finalUrl = response.url || url.toString();
    const finalPath = (() => {
      try {
        return new URL(finalUrl).pathname.toLowerCase();
      } catch {
        return url.pathname.toLowerCase();
      }
    })();
    const finalDomain = (() => {
      try {
        return new URL(finalUrl).hostname.toLowerCase().replace(/^www\./, "");
      } catch {
        return domain;
      }
    })();

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: `This file is too large to process (${Math.round(contentLength / 1_000_000)} MB, limit 15 MB). Save it via Manual Paste with the key sections instead.` },
        { status: 413 }
      );
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await response.arrayBuffer();
    } catch {
      return NextResponse.json(
        { error: "The response body could not be downloaded fully. Try again, or paste the text manually." },
        { status: 502 }
      );
    }
    if (buffer.byteLength > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "This file exceeds the 15 MB processing limit. Save it via Manual Paste with the key sections instead." },
        { status: 413 }
      );
    }

    const headBytes = new Uint8Array(buffer.slice(0, 1024));
    let headString = "";
    for (let i = 0; i < headBytes.length; i++) headString += String.fromCharCode(headBytes[i]);
    const magicBytesPdf = headString.includes("%PDF-");
    const headerSaysPdf =
      contentType.includes("application/pdf") || /\.pdf("|'|;|\s|$)/i.test(contentDisposition);
    const urlLooksPdf =
      finalPath.endsWith(".pdf") ||
      /getreport|get_report|downloadreport|download_report|getattachment|getfile|\bdl\.aspx/i.test(
        finalPath
      );
    const treatAsPdf = magicBytesPdf || headerSaysPdf || (urlLooksPdf && !contentType.includes("text/html"));

    if (treatAsPdf) {
      // PDF branch: extract text server-side (annual/quarterly reports,
      // decks, circulars, prospectuses, sustainability reports).
      const dispositionName = filenameFromDisposition(contentDisposition);
      const urlFileName = decodeURIComponent(finalPath.split("/").pop() ?? "") || "document.pdf";
      const classification = classifyTrustTier({ url: finalUrl, domain: finalDomain });

      const debugBase = {
        detectedContentType: contentType || "(none)",
        contentDisposition: contentDisposition || "(none)",
        finalUrl,
        magicBytesPdf,
      };

      const buildPdfResponse = (params: {
        title: string;
        documentType: string;
        text: string;
        pages: number;
        textQuality: "ok" | "low" | "none";
        retrievalStatus: string;
        note: string | null;
        extractionStatus: string;
        extractionError?: string | null;
      }) => {
        const thirdPartyWarning =
          classification.tier !== "tier_1" && classification.tier !== "tier_2" &&
          ["annual_report", "quarterly_report", "investor_deck", "bursa_announcement", "press_release", "other"].includes(
            params.documentType
          )
            ? "Third-party source. Prefer Bursa Malaysia or the company's IR website for Tier 1 official disclosure."
            : null;
        return NextResponse.json({
          url: finalUrl,
          domain: finalDomain,
          contentType: "pdf" as const,
          title: params.title,
          trustTier: classification.tier,
          trustTierReason: classification.reason,
          suggestedDocumentType: params.documentType,
          author: null,
          publication: null,
          language: null,
          isOfficialTier1: isOfficialTier1Domain(finalDomain),
          thirdPartyWarning,
          textPreview: params.text.slice(0, PREVIEW_CHARS),
          extractedText: params.text,
          textLength: params.text.length,
          pages: params.pages,
          textQuality: params.textQuality,
          manualFallbackNeeded: params.text.length === 0,
          retrievalStatus: params.retrievalStatus,
          note: params.note,
          debug: {
            ...debugBase,
            extractionStatus: params.extractionStatus,
            extractedTextLength: params.text.length,
            pageCount: params.pages,
            extractionError: params.extractionError ?? null,
          },
        });
      };

      try {
        const extraction = await extractPdfText(buffer);
        const title =
          cleanFileTitle(dispositionName) ??
          extraction.docTitle ??
          cleanFileTitle(urlFileName) ??
          "PDF document";
        const documentType = detectPdfDocumentType(
          `${dispositionName ?? ""} ${extraction.docTitle ?? ""} ${urlFileName} ${extraction.text.slice(0, 3000)}`
        );

        if (extraction.quality === "none") {
          return buildPdfResponse({
            title,
            documentType,
            text: "",
            pages: extraction.pages,
            textQuality: "none",
            retrievalStatus: "link_only",
            note: "No readable text layer detected. Paste the relevant sections manually.",
            extractionStatus: "no_text_layer",
          });
        }
        return buildPdfResponse({
          title,
          documentType,
          text: extraction.text,
          pages: extraction.pages,
          textQuality: extraction.quality,
          retrievalStatus: "text_extracted",
          note:
            extraction.quality === "low"
              ? `Text extracted from PDF, but only ${extraction.text.length.toLocaleString()} characters across ${extraction.pages} pages — likely mostly scanned images. Review and add missing sections before saving.`
              : "Text extracted from PDF. Please review before saving.",
          extractionStatus: "extracted",
        });
      } catch (err) {
        console.error("PDF extraction failed:", err);
        const title =
          cleanFileTitle(dispositionName) ?? cleanFileTitle(urlFileName) ?? "PDF document";
        return buildPdfResponse({
          title,
          documentType: detectPdfDocumentType(`${dispositionName ?? ""} ${urlFileName}`),
          text: "",
          pages: 0,
          textQuality: "none",
          retrievalStatus: "extraction_failed",
          note: "PDF text could not be extracted. Paste the key sections here so the AI can analyse and cite them.",
          extractionStatus: "failed",
          extractionError: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      buffer.byteLength > MAX_HTML_BYTES ? buffer.slice(0, MAX_HTML_BYTES) : buffer
    );

    const extracted = extractFromHtml(html);
    const text = extracted.text.slice(0, MAX_EXTRACTED_CHARS);
    const classification = classifyTrustTier({ url: finalUrl, domain: finalDomain });
    const isOfficialTier1 = isOfficialTier1Domain(finalDomain);
    const htmlBase = {
      url: finalUrl,
      domain: finalDomain,
      contentType: "html" as const,
      title: extracted.title,
      trustTier: classification.tier,
      trustTierReason: classification.reason,
      suggestedDocumentType: suggestDocumentType(finalUrl, finalDomain),
      author: extracted.author,
      publication: extracted.publication,
      language: extracted.language,
      isOfficialTier1,
      thirdPartyWarning: null,
      pages: 0,
      debug: {
        detectedContentType: contentType || "(none)",
        contentDisposition: contentDisposition || "(none)",
        finalUrl,
        magicBytesPdf,
        extractionStatus: "html",
        extractedTextLength: text.length,
        pageCount: 0,
        extractionError: null,
      },
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
          : "This source is saved as link-only unless key text is pasted below.",
        debug: { ...htmlBase.debug, extractionStatus: "html_too_little_text", extractedTextLength: 0 },
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
