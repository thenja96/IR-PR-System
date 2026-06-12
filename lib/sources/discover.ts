// Source Discovery engine: builds targeted queries per source type, runs them
// through the configured search provider, then ranks candidates by trust tier
// and relevance. Returns CANDIDATES ONLY — nothing is fetched or saved here;
// the user reviews and confirms imports in the UI.

import {
  classifyTrustTier,
  suggestDocumentType,
  type SourceTrustTier,
} from "@/lib/sources/trust-tier";
import {
  getSearchProvider,
  type WebSearchResult,
} from "@/lib/sources/search-provider";

export type DiscoverySourceType =
  | "bursa_announcements"
  | "annual_report"
  | "quarterly_result"
  | "investor_presentation"
  | "ir_page"
  | "press_release"
  | "media_coverage"
  | "competitor_sources"
  | "all_official";

export type DiscoveryDateRange = "last_30_days" | "last_90_days" | "last_12_months" | "custom";

export interface SourceCandidate {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  detectedType: string;
  trustTier: SourceTrustTier;
  tierReason: string;
  score: number;
  scoreReason: string;
  dateDetected: string | null;
  recommended: boolean;
  recommendedReason: string | null;
}

const RESULTS_PER_QUERY = 10;
const MAX_QUERIES = 3;
const MAX_CANDIDATES = 25;

// Domains that are never official or credible media — ranked lowest.
const LOW_QUALITY_DOMAINS = [
  "blogspot.com",
  "wordpress.com",
  "medium.com",
  "reddit.com",
  "forum.lowyat.net",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
  "quora.com",
];

const MEDIA_SITES =
  "site:theedgemalaysia.com OR site:thestar.com.my OR site:businesstoday.com.my OR site:themalaysianreserve.com OR site:focusmalaysia.my";

function buildQueries(params: {
  sourceType: DiscoverySourceType;
  companyName: string;
  stockCode?: string;
}): string[] {
  const { sourceType, companyName, stockCode } = params;
  const co = `"${companyName}"`;
  const code = stockCode ? ` ${stockCode}` : "";

  switch (sourceType) {
    case "bursa_announcements":
      return [
        `${co}${code} announcement site:bursamalaysia.com`,
        `${co} Bursa Malaysia announcement`,
      ];
    case "annual_report":
      return [
        `${co} annual report filetype:pdf`,
        `${co}${code} annual report site:bursamalaysia.com`,
        `${co} annual report investor relations`,
      ];
    case "quarterly_result":
      return [
        `${co} quarterly report results filetype:pdf`,
        `${co}${code} quarterly results Bursa`,
        `${co} interim financial report`,
      ];
    case "investor_presentation":
      return [
        `${co} investor presentation filetype:pdf`,
        `${co} corporate presentation investor relations`,
      ];
    case "ir_page":
      return [
        `${co} investor relations`,
        `${co} official website corporate information`,
      ];
    case "press_release":
      return [
        `${co} press release`,
        `${co} media release official`,
      ];
    case "media_coverage":
      return [
        `${co} ${MEDIA_SITES}`,
        `${co} Bursa Malaysia news`,
      ];
    case "competitor_sources":
      return [
        `${co} competitors peers Bursa Malaysia sector`,
        `${co} industry peers Malaysia listed`,
      ];
    case "all_official":
      return [
        `${co}${code} site:bursamalaysia.com`,
        `${co} annual report OR quarterly report filetype:pdf`,
        `${co} investor relations OR press release`,
      ];
  }
}

function dateRangeToDays(range: DiscoveryDateRange): number | undefined {
  switch (range) {
    case "last_30_days":
      return 30;
    case "last_90_days":
      return 90;
    case "last_12_months":
      return 365;
    case "custom":
      return undefined; // provider freshness off; user narrows via query/date review
  }
}

function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    // Strip tracking params so the same page dedupes.
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"].forEach(
      (p) => url.searchParams.delete(p)
    );
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

/** Keywords that confirm a result matches the requested source type. */
const TYPE_KEYWORDS: Record<DiscoverySourceType, string[]> = {
  bursa_announcements: ["announcement", "bursa"],
  annual_report: ["annual report"],
  quarterly_result: ["quarter", "interim", "q1", "q2", "q3", "q4", "results"],
  investor_presentation: ["presentation", "investor deck", "briefing"],
  ir_page: ["investor relations", "investor", "corporate"],
  press_release: ["press release", "media release"],
  media_coverage: [],
  competitor_sources: [],
  all_official: ["annual report", "quarter", "announcement", "investor"],
};

/** Refine the detected document type using the requested discovery type. */
function detectDocumentType(
  sourceType: DiscoverySourceType,
  url: string,
  domain: string,
  haystack: string
): string {
  if (haystack.includes("annual report")) return "annual_report";
  if (/quarter|interim|q[1-4]\s*(fy)?\s*20/i.test(haystack)) return "quarterly_report";
  if (haystack.includes("presentation") || haystack.includes("deck")) return "investor_deck";
  if (haystack.includes("press release") || haystack.includes("media release"))
    return "press_release";
  switch (sourceType) {
    case "bursa_announcements":
      return "bursa_announcement";
    case "annual_report":
      return "annual_report";
    case "quarterly_result":
      return "quarterly_report";
    case "investor_presentation":
      return "investor_deck";
    case "press_release":
      return "press_release";
    case "media_coverage":
    case "competitor_sources":
      return "media_article";
    default:
      return suggestDocumentType(url, domain);
  }
}

function rankCandidate(params: {
  result: WebSearchResult;
  sourceType: DiscoverySourceType;
  companyName: string;
  stockCode?: string;
}): SourceCandidate {
  const { result, sourceType, companyName, stockCode } = params;
  let domain = "";
  try {
    domain = new URL(result.url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    domain = "";
  }

  const haystack = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const isLowQuality = LOW_QUALITY_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );

  let tier: SourceTrustTier;
  let tierReason: string;
  if (isLowQuality) {
    tier = "tier_4";
    tierReason = "Blog / forum / social domain — unofficial repost, lowest priority";
  } else {
    const classification = classifyTrustTier({ url: result.url, domain });
    tier = classification.tier;
    tierReason = classification.reason;
  }

  const reasons: string[] = [];
  let score: number;
  switch (tier) {
    case "tier_1":
      score = 45;
      reasons.push("official disclosure domain");
      break;
    case "tier_2":
      score = 30;
      reasons.push("official company material");
      break;
    case "tier_3":
      score = 18;
      reasons.push("business media context");
      break;
    default:
      score = isLowQuality ? 4 : 8;
      reasons.push(isLowQuality ? "unofficial repost" : "unclassified domain");
  }

  const keywords = TYPE_KEYWORDS[sourceType];
  if (keywords.length > 0 && keywords.some((k) => haystack.includes(k))) {
    score += 15;
    reasons.push("matches requested source type");
  }
  if (haystack.includes(companyName.toLowerCase())) {
    score += 12;
    reasons.push("company name in result");
  }
  if (stockCode && haystack.includes(stockCode.toLowerCase())) {
    score += 8;
    reasons.push("stock code match");
  }
  const isPdf = result.url.toLowerCase().includes(".pdf");
  if (
    isPdf &&
    ["annual_report", "quarterly_result", "investor_presentation", "all_official"].includes(
      sourceType
    )
  ) {
    score += 10;
    reasons.push("direct report PDF");
  }
  if (result.publishedDate) {
    score += 5;
    reasons.push("date detected");
  }

  return {
    url: result.url,
    domain,
    title: result.title,
    snippet: result.snippet.slice(0, 280),
    detectedType: detectDocumentType(sourceType, result.url, domain, haystack),
    trustTier: tier,
    tierReason,
    score: Math.max(2, Math.min(100, score)),
    scoreReason: reasons.join("; "),
    dateDetected: result.publishedDate,
    recommended: false,
    recommendedReason: null,
  };
}

/**
 * Mark the suggested import set: latest quarterly result, annual report,
 * Bursa announcement, press release, plus up to two credible media articles.
 * Selection still requires explicit user confirmation in the UI.
 */
function markRecommended(candidates: SourceCandidate[]): void {
  const pickFirst = (
    predicate: (c: SourceCandidate) => boolean,
    reason: string,
    max = 1
  ) => {
    let picked = 0;
    for (const c of candidates) {
      if (picked >= max) break;
      if (!c.recommended && predicate(c)) {
        c.recommended = true;
        c.recommendedReason = reason;
        picked += 1;
      }
    }
  };

  pickFirst(
    (c) => c.detectedType === "quarterly_report" && c.trustTier !== "tier_4",
    "Latest quarterly result"
  );
  pickFirst(
    (c) => c.detectedType === "annual_report" && c.trustTier !== "tier_4",
    "Latest annual report"
  );
  pickFirst(
    (c) => c.detectedType === "bursa_announcement" && c.trustTier === "tier_1",
    "Latest Bursa announcement"
  );
  pickFirst(
    (c) => c.detectedType === "press_release" && c.trustTier !== "tier_4",
    "Latest company press release"
  );
  pickFirst(
    (c) => c.trustTier === "tier_3" && c.score >= 30,
    "Credible media context",
    2
  );
}

export async function discoverSources(params: {
  companyName: string;
  stockCode?: string;
  sourceType: DiscoverySourceType;
  dateRange: DiscoveryDateRange;
  /** Custom range bounds (YYYY-MM-DD) — applied as Google after:/before: operators (best-effort on non-Google providers). */
  customFrom?: string;
  customTo?: string;
}): Promise<{ candidates: SourceCandidate[]; providerName: string }> {
  const provider = getSearchProvider();
  if (!provider) {
    throw new Error("Search provider not configured.");
  }

  let queries = buildQueries(params).slice(0, MAX_QUERIES);
  if (params.dateRange === "custom" && (params.customFrom || params.customTo)) {
    const after = params.customFrom ? ` after:${params.customFrom}` : "";
    const before = params.customTo ? ` before:${params.customTo}` : "";
    queries = queries.map((q) => `${q}${after}${before}`);
  }
  const freshnessDays = dateRangeToDays(params.dateRange);

  const resultSets = await Promise.all(
    queries.map((q) =>
      provider
        .search(q, { freshnessDays, count: RESULTS_PER_QUERY })
        .catch((err) => {
          console.error(`Search query failed (${provider.name}): ${q}`, err);
          return [] as WebSearchResult[];
        })
    )
  );

  // Dedupe across queries, keeping the first occurrence.
  const seen = new Set<string>();
  const unique: WebSearchResult[] = [];
  for (const result of resultSets.flat()) {
    const key = normalizeUrl(result.url);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }

  const candidates = unique
    .map((result) =>
      rankCandidate({
        result,
        sourceType: params.sourceType,
        companyName: params.companyName,
        stockCode: params.stockCode,
      })
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);

  markRecommended(candidates);

  return { candidates, providerName: provider.name };
}
