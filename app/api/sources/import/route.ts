// Saves a user-confirmed URL import into source_documents.
// The preview from /api/sources/fetch-url is shown to the user first; only on
// confirmation does the client call this route with the final values.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyTextQuality } from "@/lib/sources/extract-pdf";
import { usefulnessForDocumentType } from "@/lib/sources/trust-tier";

const DOCUMENT_TYPES = [
  "annual_report",
  "quarterly_report",
  "investor_deck",
  "bursa_announcement",
  "press_release",
  "media_article",
  "price_volume_csv",
  "macro_note",
  "trading_note",
  "other",
];

const TRUST_TIERS = ["tier_1", "tier_2", "tier_3", "tier_4"];
const RETRIEVAL_STATUSES = [
  "manual",
  "fetched",
  "fetch_failed",
  "pdf_link_only",
  "text_extracted",
  "link_only",
  "extraction_failed",
  "manual_with_official_url",
];

interface ImportRequestBody {
  title?: string;
  documentType?: string;
  companyId?: string | null;
  workspaceId?: string | null;
  sourceDate?: string | null;
  extractedText?: string;
  url?: string | null;
  domain?: string | null;
  trustTier?: string;
  retrievalStatus?: string;
  author?: string | null;
  publication?: string | null;
  language?: string | null;
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

    const body = (await request.json()) as ImportRequestBody;

    const title = (body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Source title is required." }, { status: 400 });
    }
    const documentType = body.documentType ?? "other";
    if (!DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json({ error: `Invalid document type: ${documentType}` }, { status: 400 });
    }
    const trustTier = body.trustTier ?? "tier_3";
    if (!TRUST_TIERS.includes(trustTier)) {
      return NextResponse.json({ error: `Invalid trust tier: ${trustTier}` }, { status: 400 });
    }
    const retrievalStatus = body.retrievalStatus ?? "fetched";
    if (!RETRIEVAL_STATUSES.includes(retrievalStatus)) {
      return NextResponse.json({ error: `Invalid retrieval status: ${retrievalStatus}` }, { status: 400 });
    }
    const extractedText = (body.extractedText ?? "").trim();
    if (!extractedText && !body.url) {
      return NextResponse.json(
        { error: "Nothing to save — provide extracted text or a source URL." },
        { status: 400 }
      );
    }
    if (extractedText.length > 200_000) {
      return NextResponse.json(
        { error: "Extracted text is too large to save (200k character limit)." },
        { status: 400 }
      );
    }

    // Resolve the Client IR/PR workspace (same convention as the manual form).
    let workspaceId = body.workspaceId ?? null;
    if (!workspaceId) {
      const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("workspace_type", "client_ir_pr")
        .limit(1)
        .maybeSingle();
      if (wsError) throw wsError;
      if (!ws) {
        return NextResponse.json(
          { error: "No Client IR/PR workspace found. Run the seed SQL first." },
          { status: 400 }
        );
      }
      workspaceId = ws.id;
    }

    const retrievedAt = new Date().toISOString();
    const textQuality = classifyTextQuality(extractedText);
    const usefulness = usefulnessForDocumentType(documentType);
    const citation = {
      title,
      url: body.url ?? null,
      domain: body.domain ?? null,
      publication: body.publication ?? null,
      author: body.author ?? null,
      source_date: body.sourceDate ?? null,
      trust_tier: trustTier,
      retrieved_at: retrievedAt,
      text_quality: textQuality,
      usefulness,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("source_documents")
      .insert({
        workspace_id: workspaceId,
        company_id: body.companyId || null,
        document_type: documentType,
        document_title: title,
        extracted_text: extractedText || null,
        source_date: body.sourceDate || null,
        uploaded_by: user.id,
        source_url: body.url ?? null,
        source_domain: body.domain ?? null,
        source_trust_tier: trustTier,
        retrieval_status: retrievalStatus,
        retrieved_at: retrievedAt,
        source_author: body.author ?? null,
        source_publication: body.publication ?? null,
        source_language: body.language ?? null,
        source_citation: citation,
        source_usefulness: usefulness,
      })
      .select("id")
      .single();

    if (insertError) {
      // Most likely cause: migration 0002 not applied yet.
      if (
        /source_trust_tier|source_url|retrieval_status|source_usefulness|schema cache/i.test(
          insertError.message
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Database is missing Source Intelligence columns or statuses. Run supabase/migrations/0002_source_intelligence.sql and 0003_source_extraction.sql first.",
          },
          { status: 500 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ id: inserted.id, saved: true });
  } catch (err) {
    console.error("source import error:", err);
    const message = err instanceof Error ? err.message : "Source import failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
