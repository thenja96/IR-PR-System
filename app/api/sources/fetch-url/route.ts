// Server-side URL fetch + preview for the Source Intelligence Centre.
// Fetches the page on the server (never from the browser), extracts a readable
// title and text, classifies the trust tier, and returns a PREVIEW ONLY —
// nothing is saved until the user confirms via /api/sources/import.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromHtml } from "@/lib/sources/extract";
import { classifyTrustTier, suggestDocumentType } from "@/lib/sources/trust-tier";

export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;
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
      // Phase 1: PDFs are saved as link-only sources; text must be pasted manually.
      const fileName = decodeURIComponent(url.pathname.split("/").pop() ?? "document.pdf");
      const classification = classifyTrustTier({ url: url.toString(), domain });
      return NextResponse.json({
        url: url.toString(),
        domain,
        contentType: "pdf",
        title: fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "PDF document",
        textPreview: "",
        extractedText: "",
        textLength: 0,
        retrievalStatus: "pdf_link_only",
        trustTier: classification.tier,
        trustTierReason: classification.reason,
        suggestedDocumentType: suggestDocumentType(url.toString(), domain),
        author: null,
        publication: null,
        language: null,
        note: "PDF detected. Phase 1 saves the PDF link and metadata only — paste the key sections into the text box so the AI can analyse and cite them.",
      });
    }

    let html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      html = html.slice(0, MAX_HTML_BYTES);
    }

    const extracted = extractFromHtml(html);
    const text = extracted.text.slice(0, MAX_EXTRACTED_CHARS);
    const classification = classifyTrustTier({ url: url.toString(), domain });

    if (text.trim().length < 80) {
      return NextResponse.json(
        {
          error:
            "Very little readable text was found on this page (it may be JavaScript-rendered or behind a paywall). Paste the text manually instead.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      url: url.toString(),
      domain,
      contentType: "html",
      title: extracted.title,
      textPreview: text.slice(0, PREVIEW_CHARS),
      extractedText: text,
      textLength: text.length,
      retrievalStatus: "fetched",
      trustTier: classification.tier,
      trustTierReason: classification.reason,
      suggestedDocumentType: suggestDocumentType(url.toString(), domain),
      author: extracted.author,
      publication: extracted.publication,
      language: extracted.language,
      note: null,
    });
  } catch (err) {
    console.error("fetch-url error:", err);
    return NextResponse.json(
      { error: "URL fetch failed unexpectedly." },
      { status: 500 }
    );
  }
}
