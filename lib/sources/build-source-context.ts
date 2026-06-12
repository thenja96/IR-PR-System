// Builds the "Selected Source Documents" block injected into client AI
// prompts. Server-side only — fetches through the user's Supabase session so
// row-level security decides what they can read.

import { createClient } from "@/lib/supabase/server";
import {
  TRUST_TIER_LABELS,
  tierForDocumentType,
  type SourceTrustTier,
} from "@/lib/sources/trust-tier";

const MAX_SOURCES = 10;
const MAX_CHARS_PER_SOURCE = 25_000;
const MAX_TOTAL_TEXT_CHARS = 100_000;

interface SourceContextRow {
  id: string;
  document_title: string;
  document_type: string;
  source_date: string | null;
  source_url: string | null;
  source_domain: string | null;
  source_trust_tier: string | null;
  retrieval_status: string | null;
  extracted_text: string | null;
}

const TIER_ORDER: Record<string, number> = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
  tier_4: 4,
};

/**
 * Fetch the selected sources and format them as a structured context string,
 * highest-trust first, with per-source and total truncation. Returns "" when
 * nothing usable was found (caller falls back to manual input only).
 */
export async function buildSourceContext(sourceIds: string[]): Promise<string> {
  const ids = Array.from(new Set(sourceIds)).slice(0, MAX_SOURCES);
  if (ids.length === 0) return "";

  const supabase = createClient();
  const { data, error } = await supabase
    .from("source_documents")
    .select(
      "id, document_title, document_type, source_date, source_url, source_domain, source_trust_tier, retrieval_status, extracted_text"
    )
    .in("id", ids);

  if (error) {
    console.error("buildSourceContext fetch error:", error);
    return "";
  }
  const rows = (data ?? []) as SourceContextRow[];
  if (rows.length === 0) return "";

  // Highest-trust first so the model anchors on official disclosure.
  rows.sort((a, b) => {
    const tierA = TIER_ORDER[a.source_trust_tier ?? tierForDocumentType(a.document_type)] ?? 4;
    const tierB = TIER_ORDER[b.source_trust_tier ?? tierForDocumentType(b.document_type)] ?? 4;
    if (tierA !== tierB) return tierA - tierB;
    return (b.source_date ?? "").localeCompare(a.source_date ?? "");
  });

  let totalTextChars = 0;
  const blocks = rows.map((row, index) => {
    const tier = (row.source_trust_tier ??
      tierForDocumentType(row.document_type)) as SourceTrustTier;

    let text = (row.extracted_text ?? "").trim();
    let textNote = "";
    if (!text) {
      textNote =
        "(No extracted text available — link-only source. Any claim attributed to it requires verification.)";
    } else {
      const originalLength = text.length;
      const remaining = Math.max(0, MAX_TOTAL_TEXT_CHARS - totalTextChars);
      const cap = Math.min(MAX_CHARS_PER_SOURCE, remaining);
      if (cap === 0) {
        text = "";
        textNote =
          "(Text omitted — combined source material exceeded the size limit. Metadata above remains citable; content requires verification.)";
      } else if (text.length > cap) {
        text = text.slice(0, cap);
        textNote = `\n[Truncated — showing first ${cap.toLocaleString()} of ${originalLength.toLocaleString()} characters.]`;
      }
      totalTextChars += text.length;
    }

    return [
      `SOURCE ${index + 1}`,
      `Title: ${row.document_title}`,
      `Type: ${row.document_type.replace(/_/g, " ")}`,
      `Date: ${row.source_date ?? "not stated"}`,
      `URL: ${row.source_url ?? "not available"}`,
      `Domain: ${row.source_domain ?? "not available"}`,
      `Trust Tier: ${TRUST_TIER_LABELS[tier] ?? tier}`,
      `Retrieval Status: ${row.retrieval_status ?? "manual"}`,
      `Text:`,
      text || textNote,
      text && textNote ? textNote : "",
    ]
      .filter((line) => line !== "")
      .join("\n");
  });

  return blocks.join("\n\n---\n\n");
}
