// Source Discovery endpoint: searches the web for public source candidates
// for a Bursa-listed company. Returns RANKED CANDIDATES ONLY — nothing is
// fetched in full or saved; the user reviews and imports explicitly via the
// existing /api/sources/fetch-url + /api/sources/import flow.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSearchConfigured } from "@/lib/sources/search-provider";
import {
  discoverSources,
  type DiscoveryDateRange,
  type DiscoverySourceType,
} from "@/lib/sources/discover";

export const maxDuration = 60;

const SOURCE_TYPES: DiscoverySourceType[] = [
  "bursa_announcements",
  "annual_report",
  "quarterly_result",
  "investor_presentation",
  "ir_page",
  "press_release",
  "media_coverage",
  "competitor_sources",
  "all_official",
];

const DATE_RANGES: DiscoveryDateRange[] = [
  "last_30_days",
  "last_90_days",
  "last_12_months",
  "custom",
];

interface DiscoverRequestBody {
  company_name?: string;
  stock_code?: string;
  source_type?: string;
  date_range?: string;
  custom_from?: string;
  custom_to?: string;
  company_id?: string;
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

    if (!isSearchConfigured()) {
      return NextResponse.json({
        configured: false,
        message:
          "Source Discovery needs a search API key. Set SEARCH_PROVIDER (serper, tavily, or brave) and SEARCH_API_KEY in .env.local, then restart the server. Until then, use the URL Import tab to add sources manually.",
        candidates: [],
      });
    }

    const body = (await request.json()) as DiscoverRequestBody;
    const companyName = (body.company_name ?? "").trim();
    if (companyName.length < 2) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }
    const sourceType = (body.source_type ?? "all_official") as DiscoverySourceType;
    if (!SOURCE_TYPES.includes(sourceType)) {
      return NextResponse.json(
        { error: `Invalid source type: ${body.source_type}` },
        { status: 400 }
      );
    }
    const dateRange = (body.date_range ?? "last_12_months") as DiscoveryDateRange;
    if (!DATE_RANGES.includes(dateRange)) {
      return NextResponse.json(
        { error: `Invalid date range: ${body.date_range}` },
        { status: 400 }
      );
    }

    const isIsoDate = (s: unknown): s is string =>
      typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

    const { candidates, providerName } = await discoverSources({
      companyName,
      stockCode: (body.stock_code ?? "").trim() || undefined,
      sourceType,
      dateRange,
      customFrom: isIsoDate(body.custom_from) ? body.custom_from : undefined,
      customTo: isIsoDate(body.custom_to) ? body.custom_to : undefined,
    });

    return NextResponse.json({
      configured: true,
      provider: providerName,
      candidates,
      recommendedCount: candidates.filter((c) => c.recommended).length,
    });
  } catch (err) {
    console.error("source discover error:", err);
    const message =
      err instanceof Error ? err.message : "Source discovery failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
