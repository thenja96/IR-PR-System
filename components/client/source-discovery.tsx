"use client";

// Find Sources tab: semi-automated source discovery for Bursa-listed
// companies. Searches the web server-side (/api/sources/discover), shows
// ranked candidates for review, and imports ONLY the ones the user selects —
// each via the existing fetch-url + import flow. Nothing is auto-trusted or
// auto-saved; failed extractions are saved as link-only with a warning.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Compass,
  Download,
  ExternalLink,
  Loader2,
  Search,
  SearchX,
  Star,
  TriangleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TRUST_TIER_SHORT_LABELS, type SourceTrustTier } from "@/lib/sources/trust-tier";

const TIER_BADGE_VARIANTS: Record<SourceTrustTier, "success" | "info" | "warning" | "secondary"> = {
  tier_1: "success",
  tier_2: "info",
  tier_3: "warning",
  tier_4: "secondary",
};

const SOURCE_TYPE_OPTIONS = [
  { value: "all_official", label: "All official sources" },
  { value: "bursa_announcements", label: "Latest Bursa announcements" },
  { value: "annual_report", label: "Annual report" },
  { value: "quarterly_result", label: "Quarterly result" },
  { value: "investor_presentation", label: "Investor presentation" },
  { value: "ir_page", label: "Company website / IR page" },
  { value: "press_release", label: "Press release" },
  { value: "media_coverage", label: "Media coverage" },
  { value: "competitor_sources", label: "Competitor sources" },
];

const DATE_RANGE_OPTIONS = [
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_12_months", label: "Last 12 months" },
  { value: "custom", label: "Custom" },
];

interface Candidate {
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

type ImportStatus = "importing" | "imported" | "link_only" | "failed";

interface CompanyOption {
  id: string;
  company_name: string;
  stock_code: string | null;
  bursa_market: string | null;
}

export function SourceDiscovery({
  initialCompanyId,
  initialCompanyName,
  initialStockCode,
}: {
  initialCompanyId?: string;
  initialCompanyName?: string;
  initialStockCode?: string;
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [companyName, setCompanyName] = useState(initialCompanyName ?? "");
  const [stockCode, setStockCode] = useState(initialStockCode ?? "");
  const [bursaMarket, setBursaMarket] = useState("");
  const [sourceType, setSourceType] = useState("all_official");
  const [dateRange, setDateRange] = useState("last_12_months");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importStatuses, setImportStatuses] = useState<Record<string, ImportStatus>>({});
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("companies")
      .select("id, company_name, stock_code, bursa_market")
      .order("company_name")
      .then(({ data }) => setCompanies((data ?? []) as CompanyOption[]));
  }, []);

  function handleCompanySelect(id: string) {
    setCompanyId(id);
    const company = companies.find((c) => c.id === id);
    if (company) {
      setCompanyName(company.company_name);
      setStockCode(company.stock_code ?? "");
      setBursaMarket(company.bursa_market ?? "");
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setSetupMessage(null);
    setCandidates([]);
    setSelected(new Set());
    setImportStatuses({});
    try {
      const res = await fetch("/api/sources/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          stock_code: stockCode || undefined,
          source_type: sourceType,
          date_range: dateRange,
          custom_from: dateRange === "custom" ? customFrom || undefined : undefined,
          custom_to: dateRange === "custom" ? customTo || undefined : undefined,
          company_id: companyId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      if (data.configured === false) {
        setSetupMessage(data.message);
      } else {
        setCandidates(data.candidates as Candidate[]);
      }
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function selectRecommended() {
    setSelected(new Set(candidates.filter((c) => c.recommended).map((c) => c.url)));
  }

  async function importCandidate(c: Candidate): Promise<ImportStatus> {
    const importBody = (extra: Record<string, unknown>) => ({
      title: c.title,
      documentType: c.detectedType,
      companyId: companyId || null,
      url: c.url,
      domain: c.domain,
      trustTier: c.trustTier,
      ...extra,
    });
    try {
      const fetchRes = await fetch("/api/sources/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: c.url }),
      });
      const preview = await fetchRes.json();

      if (fetchRes.ok) {
        const res = await fetch("/api/sources/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            importBody({
              title: preview.title || c.title,
              extractedText: preview.extractedText ?? "",
              retrievalStatus: preview.retrievalStatus,
              author: preview.author,
              publication: preview.publication,
              language: preview.language,
            })
          ),
        });
        if (!res.ok) return "failed";
        return preview.extractedText ? "imported" : "link_only";
      }

      // Page could not be fetched/extracted (paywall, JS-rendered, blocked) —
      // save the URL and metadata as a link-only record.
      const res = await fetch("/api/sources/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          importBody({ extractedText: "", retrievalStatus: "fetch_failed" })
        ),
      });
      return res.ok ? "link_only" : "failed";
    } catch {
      return "failed";
    }
  }

  async function handleImportSelected() {
    setImporting(true);
    // Sequential on purpose — polite to target sites, and statuses stream in.
    for (const c of candidates) {
      if (!selected.has(c.url) || importStatuses[c.url]) continue;
      setImportStatuses((prev) => ({ ...prev, [c.url]: "importing" }));
      const status = await importCandidate(c);
      setImportStatuses((prev) => ({ ...prev, [c.url]: status }));
    }
    setImporting(false);
    router.refresh();
  }

  const recommendedCandidates = useMemo(
    () => candidates.filter((c) => c.recommended),
    [candidates]
  );
  const linkOnlyCount = Object.values(importStatuses).filter((s) => s === "link_only").length;
  const pendingSelection = candidates.filter(
    (c) => selected.has(c.url) && !importStatuses[c.url]
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-primary" /> Find sources online
          </CardTitle>
          <CardDescription>
            Searches public sources for a Bursa-listed company — official disclosures
            first. Results are candidates only: review, select, and import before
            anything is saved or used by AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Company (links imports)</Label>
              <Select value={companyId} onChange={(e) => handleCompanySelect(e.target.value)}>
                <option value="">— Not linked to a company —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Company name *</Label>
              <Input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Chin Hin Group Berhad"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock code</Label>
              <Input
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value)}
                placeholder="e.g. 5273"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bursa market</Label>
              <Input
                value={bursaMarket}
                onChange={(e) => setBursaMarket(e.target.value)}
                placeholder="e.g. Main Market"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source type</Label>
              <Select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                {SOURCE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date range</Label>
              <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                {DATE_RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            {dateRange === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={searching || !companyName.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {searching ? "Searching…" : "Search sources"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </CardContent>
        </Card>
      )}

      {setupMessage && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {setupMessage}
          </CardContent>
        </Card>
      )}

      {searching && (
        <Card>
          <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            Searching official and public sources…
          </CardContent>
        </Card>
      )}

      {searched && !searching && !setupMessage && candidates.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No source candidates found</p>
            <p className="text-sm text-muted-foreground">
              Try a broader source type or longer date range — or add sources via the
              URL Import tab.
            </p>
          </CardContent>
        </Card>
      )}

      {candidates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">
                {candidates.length} source candidate{candidates.length > 1 ? "s" : ""}
              </CardTitle>
              {recommendedCandidates.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={selectRecommended}>
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  Select recommended ({recommendedCandidates.length})
                </Button>
              )}
              <div className="ml-auto">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleImportSelected}
                  disabled={importing || pendingSelection === 0}
                >
                  {importing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Import selected ({pendingSelection})
                </Button>
              </div>
            </div>
            <CardDescription>
              Recommended for IR/PR analysis: latest quarterly result, annual report,
              Bursa announcement, press release, and 1–2 credible media articles.
              Nothing is saved until you import it.
            </CardDescription>
            {linkOnlyCount > 0 && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {linkOnlyCount} source{linkOnlyCount > 1 ? "s were" : " was"} saved as
                link-only (text could not be extracted). Paste the key sections manually
                in the Source Intelligence Centre before AI analysis.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y border-t">
              {candidates.map((c) => {
                const status = importStatuses[c.url];
                const isSelected = selected.has(c.url);
                return (
                  <li
                    key={c.url}
                    className={cn("px-4 py-3 sm:px-5", isSelected && !status && "bg-teal-50/40")}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={Boolean(status) || importing}
                        onChange={() => toggle(c.url)}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-teal-600 disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium leading-snug hover:underline"
                          >
                            {c.title}
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                          {c.recommended && (
                            <Badge className="gap-1 border-transparent bg-amber-100 text-amber-800">
                              <Star className="h-3 w-3" />
                              {c.recommendedReason ?? "Recommended"}
                            </Badge>
                          )}
                        </div>
                        {c.snippet && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {c.snippet}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant={TIER_BADGE_VARIANTS[c.trustTier] ?? "secondary"}>
                            {TRUST_TIER_SHORT_LABELS[c.trustTier] ?? c.trustTier}
                          </Badge>
                          <Badge variant="info">{c.detectedType.replace(/_/g, " ")}</Badge>
                          <span className="rounded-full border px-2 py-0.5 font-medium tabular-nums">
                            {c.score}/100
                          </span>
                          <span>{c.domain}</span>
                          {c.dateDetected && <span>{c.dateDetected}</span>}
                          {status === "importing" && (
                            <Badge variant="info" className="gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> importing
                            </Badge>
                          )}
                          {status === "imported" && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> imported
                            </Badge>
                          )}
                          {status === "link_only" && (
                            <Badge variant="warning" className="gap-1">
                              <TriangleAlert className="h-3 w-3" /> link only — paste text manually
                            </Badge>
                          )}
                          {status === "failed" && (
                            <Badge variant="danger" className="gap-1">
                              <TriangleAlert className="h-3 w-3" /> import failed
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          Why found: {c.scoreReason} · {c.tierReason}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
