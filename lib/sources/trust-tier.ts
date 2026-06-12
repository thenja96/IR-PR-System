// Source trust tier classification for the Source Intelligence Centre.
//
// Tier 1 — Official Disclosure: Bursa announcements, annual/quarterly reports,
//          circulars, prospectuses, official company IR pages and press releases.
// Tier 2 — Official Company Communication: investor decks, AGM presentations,
//          sustainability reports, factsheets, management speeches.
// Tier 3 — Media / Market Context: business media and market commentary.
// Tier 4 — User Notes / Internal Notes.
//
// Used server-side by /api/sources/fetch-url and client-side for display.

export type SourceTrustTier = "tier_1" | "tier_2" | "tier_3" | "tier_4";

export const TRUST_TIER_LABELS: Record<SourceTrustTier, string> = {
  tier_1: "Tier 1 — Official Disclosure",
  tier_2: "Tier 2 — Official Company Communication",
  tier_3: "Tier 3 — Media / Market Context",
  tier_4: "Tier 4 — User / Internal Notes",
};

export const TRUST_TIER_SHORT_LABELS: Record<SourceTrustTier, string> = {
  tier_1: "Tier 1 · Official Disclosure",
  tier_2: "Tier 2 · Company Communication",
  tier_3: "Tier 3 · Media / Market",
  tier_4: "Tier 4 · Internal Notes",
};

// ── Usefulness classification (Phase 3B) ─────────────────────
// How much weight a source carries in IR/PR analysis, independent of trust
// tier: an annual report is primary material; a media article is context.

export type SourceUsefulness =
  | "high_usefulness"
  | "medium_usefulness"
  | "context_only"
  | "low_usefulness";

export const USEFULNESS_LABELS: Record<SourceUsefulness, string> = {
  high_usefulness: "High usefulness",
  medium_usefulness: "Medium usefulness",
  context_only: "Context only",
  low_usefulness: "Low usefulness",
};

const DOCUMENT_TYPE_USEFULNESS: Record<string, SourceUsefulness> = {
  annual_report: "high_usefulness",
  quarterly_report: "high_usefulness",
  bursa_announcement: "high_usefulness",
  investor_deck: "medium_usefulness",
  press_release: "medium_usefulness",
  media_article: "context_only",
  price_volume_csv: "context_only",
  macro_note: "low_usefulness",
  trading_note: "low_usefulness",
  other: "low_usefulness",
};

export function usefulnessForDocumentType(documentType: string): SourceUsefulness {
  return DOCUMENT_TYPE_USEFULNESS[documentType] ?? "low_usefulness";
}

// Regulator / exchange domains — always Tier 1.
const TIER_1_DOMAINS = ["bursamalaysia.com", "sc.com.my", "bnm.gov.my"];

export function isOfficialTier1Domain(domain: string): boolean {
  const d = domain.toLowerCase();
  return TIER_1_DOMAINS.some((t) => d === t || d.endsWith(`.${t}`));
}

// Malaysian business media — Tier 3.
const TIER_3_DOMAINS = [
  "theedgemalaysia.com",
  "theedgemarkets.com",
  "thestar.com.my",
  "businesstoday.com.my",
  "themalaysianreserve.com",
  "focusmalaysia.my",
  "9shares.my",
  "i3investor.com",
  "klsescreener.com",
  "nst.com.my",
  "bernama.com",
  "malaymail.com",
  "freemalaysiatoday.com",
  "dailyexpress.com.my",
];

// URL path fragments that signal an official company disclosure page (Tier 1).
const TIER_1_PATH_HINTS = [
  "investor-relations",
  "/investor",
  "/ir/",
  "press-release",
  "press_release",
  "media-release",
  "news-release",
  "/announcement",
  "annual-report",
  "quarterly-report",
];

// URL path fragments that signal official company communication (Tier 2).
const TIER_2_PATH_HINTS = [
  "presentation",
  "investor-deck",
  "sustainability",
  "factsheet",
  "corporate-profile",
  "/agm",
  "/egm",
  "speech",
];

// Fallback by document type when the domain/path gives no signal.
const DOCUMENT_TYPE_TIERS: Record<string, SourceTrustTier> = {
  bursa_announcement: "tier_1",
  annual_report: "tier_1",
  quarterly_report: "tier_1",
  press_release: "tier_1",
  investor_deck: "tier_2",
  media_article: "tier_3",
  price_volume_csv: "tier_3",
  macro_note: "tier_4",
  trading_note: "tier_4",
  other: "tier_4",
};

function domainMatches(domain: string, list: string[]): boolean {
  return list.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function tierForDocumentType(documentType: string): SourceTrustTier {
  return DOCUMENT_TYPE_TIERS[documentType] ?? "tier_4";
}

export interface TrustClassification {
  tier: SourceTrustTier;
  reason: string;
}

/**
 * Classify a source's trust tier from its URL/domain, falling back to the
 * document type. Unknown web domains default to Tier 3 (media/market context)
 * — never higher — so unverified sites are not treated as official disclosure.
 */
export function classifyTrustTier(params: {
  url?: string | null;
  domain?: string | null;
  documentType?: string | null;
}): TrustClassification {
  const domain = (params.domain ?? "").toLowerCase();
  const path = (() => {
    try {
      return params.url ? new URL(params.url).pathname.toLowerCase() : "";
    } catch {
      return "";
    }
  })();

  if (domain && domainMatches(domain, TIER_1_DOMAINS)) {
    return { tier: "tier_1", reason: `Official regulator/exchange domain (${domain})` };
  }
  if (domain && domainMatches(domain, TIER_3_DOMAINS)) {
    return { tier: "tier_3", reason: `Recognised business media domain (${domain})` };
  }
  if (path && TIER_1_PATH_HINTS.some((h) => path.includes(h))) {
    return { tier: "tier_1", reason: "Company IR / press release page detected from URL path" };
  }
  if (path && TIER_2_PATH_HINTS.some((h) => path.includes(h))) {
    return { tier: "tier_2", reason: "Company presentation / corporate material detected from URL path" };
  }
  if (params.documentType) {
    const tier = tierForDocumentType(params.documentType);
    return { tier, reason: `Classified from document type (${params.documentType})` };
  }
  if (domain) {
    return { tier: "tier_3", reason: "Unrecognised web domain — treated as media/market context" };
  }
  return { tier: "tier_4", reason: "No URL — treated as user/internal note" };
}

/** Suggest a document type from the URL so the import form pre-fills sensibly. */
export function suggestDocumentType(url: string, domain: string): string {
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (domainMatches(domain.toLowerCase(), ["bursamalaysia.com"])) return "bursa_announcement";
  if (path.includes("annual-report") || path.includes("annual_report")) return "annual_report";
  if (path.includes("quarterly") || path.includes("interim")) return "quarterly_report";
  if (path.includes("presentation") || path.includes("deck")) return "investor_deck";
  if (TIER_1_PATH_HINTS.some((h) => path.includes(h) && h.includes("press"))) return "press_release";
  if (domainMatches(domain.toLowerCase(), TIER_3_DOMAINS)) return "media_article";
  return "media_article";
}
