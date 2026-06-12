"use client";

// URL Import tab of the Source Intelligence Centre.
// Step 1: paste a URL → server fetches and returns a preview (nothing saved).
//   - HTML pages: readable text extracted
//   - PDFs: text extracted server-side (Phase 3B)
//   - JS-rendered / paywalled pages (incl. Bursa announcements): manual
//     fallback panel keeps the official URL + tier while text is pasted.
// Step 2: user reviews and EDITS the extracted text → confirms → import.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileWarning,
  Globe,
  Landmark,
  Link2,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TRUST_TIER_LABELS, type SourceTrustTier } from "@/lib/sources/trust-tier";
import type { Company } from "@/types/database";

const DOCUMENT_TYPES = [
  "bursa_announcement",
  "annual_report",
  "quarterly_report",
  "press_release",
  "investor_deck",
  "media_article",
  "macro_note",
  "other",
];

const TIER_BADGE_VARIANTS: Record<SourceTrustTier, "success" | "info" | "warning" | "secondary"> = {
  tier_1: "success",
  tier_2: "info",
  tier_3: "warning",
  tier_4: "secondary",
};

interface UrlPreview {
  url: string;
  domain: string;
  contentType: "html" | "pdf";
  title: string;
  textPreview: string;
  extractedText: string;
  textLength: number;
  pages: number;
  textQuality: "ok" | "low" | "none";
  manualFallbackNeeded: boolean;
  isOfficialTier1: boolean;
  retrievalStatus: string;
  trustTier: SourceTrustTier;
  trustTierReason: string;
  suggestedDocumentType: string;
  author: string | null;
  publication: string | null;
  language: string | null;
  note: string | null;
}

export function SourceUrlImport() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Pick<Company, "id" | "company_name">[]>([]);
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<UrlPreview | null>(null);
  // Editable fields shown in the confirmation step
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("media_article");
  const [trustTier, setTrustTier] = useState<SourceTrustTier>("tier_3");
  const [companyId, setCompanyId] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("companies")
      .select("id, company_name")
      .order("company_name")
      .then(({ data }) => setCompanies(data ?? []));
  }, []);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setFetching(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    try {
      const res = await fetch("/api/sources/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed.");
      const p = data as UrlPreview;
      setPreview(p);
      setTitle(p.title);
      setDocumentType(p.suggestedDocumentType);
      setTrustTier(p.trustTier);
      setEditedText(p.extractedText ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed.");
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      const text = editedText.trim();
      // Final retrieval status reflects what actually happened:
      // extracted automatically, pasted manually against an official URL,
      // or saved as a link-only record.
      let retrievalStatus = preview.retrievalStatus;
      if (preview.manualFallbackNeeded) {
        retrievalStatus = text
          ? preview.isOfficialTier1
            ? "manual_with_official_url"
            : "manual"
          : preview.retrievalStatus === "extraction_failed"
            ? "extraction_failed"
            : "link_only";
      } else if (!text) {
        retrievalStatus = "link_only";
      }

      const res = await fetch("/api/sources/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          documentType,
          companyId: companyId || null,
          sourceDate: sourceDate || null,
          extractedText: text,
          url: preview.url,
          domain: preview.domain,
          trustTier,
          retrievalStatus,
          author: preview.author,
          publication: preview.publication,
          language: preview.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setSuccess(
        text
          ? "Source saved with text."
          : "Source saved as link-only — paste the key text later so AI can analyse it."
      );
      setPreview(null);
      setUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function extractionBadge(p: UrlPreview) {
    if (p.manualFallbackNeeded) {
      return (
        <Badge variant="danger" className="gap-1">
          <TriangleAlert className="h-3 w-3" /> Manual fallback needed
        </Badge>
      );
    }
    if (p.textQuality === "low") {
      return (
        <Badge variant="warning" className="gap-1">
          <FileWarning className="h-3 w-3" /> Low text quality
        </Badge>
      );
    }
    if (p.textLength > 0) {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Text extracted
        </Badge>
      );
    }
    return (
      <Badge variant="warning" className="gap-1">
        <Link2 className="h-3 w-3" /> Link only
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-primary" /> Import from URL
        </CardTitle>
        <CardDescription>
          Paste a link from Bursa Malaysia, a company website, a press release page, a
          report PDF, an investor deck, or a media article. PDFs and pages are fetched
          server-side and text is extracted where possible — you review and confirm
          before anything is saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleFetch} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.bursamalaysia.com/market_information/announcements/…"
            className="flex-1"
          />
          <Button type="submit" disabled={fetching || !url.trim()}>
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {fetching ? "Fetching…" : "Fetch preview"}
          </Button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="flex items-center gap-1.5 text-sm text-teal-700">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </p>
        )}

        {preview && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {extractionBadge(preview)}
              <Badge variant={TIER_BADGE_VARIANTS[trustTier]}>
                {TRUST_TIER_LABELS[trustTier]}
              </Badge>
              {preview.isOfficialTier1 && (
                <Badge variant="success" className="gap-1">
                  <Landmark className="h-3 w-3" /> Official disclosure source
                </Badge>
              )}
              <Badge variant="outline">{preview.domain}</Badge>
              {preview.contentType === "pdf" && (
                <Badge variant="info">
                  PDF{preview.pages > 0 ? ` · ${preview.pages} pages` : ""}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{preview.trustTierReason}</p>
            {preview.note && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2.5 text-xs text-amber-800">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {preview.note}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Document type</Label>
                <Select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trust tier</Label>
                <Select
                  value={trustTier}
                  onChange={(e) => setTrustTier(e.target.value as SourceTrustTier)}
                >
                  {(Object.keys(TRUST_TIER_LABELS) as SourceTrustTier[]).map((t) => (
                    <option key={t} value={t}>
                      {TRUST_TIER_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Company (optional)</Label>
                <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  <option value="">— Not company-specific —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source date (optional)</Label>
                <Input
                  type="date"
                  value={sourceDate}
                  onChange={(e) => setSourceDate(e.target.value)}
                />
              </div>
            </div>

            {preview.manualFallbackNeeded ? (
              <div className="space-y-1.5 rounded-md border border-amber-300 bg-amber-50/60 p-3">
                <Label className="flex items-center gap-1.5 text-amber-900">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  {preview.isOfficialTier1
                    ? "Bursa manual fallback — paste the announcement text"
                    : "Manual fallback — paste the page text"}
                </Label>
                <p className="text-xs text-amber-800">
                  The official URL, title, domain, and trust tier will be saved either
                  way. Pasting the text here makes the source usable by AI analysis.
                </p>
                <Textarea
                  rows={8}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  placeholder="Open the page in your browser, copy the announcement / document text, and paste it here…"
                  className="bg-background"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>
                  Extracted text ({editedText.length.toLocaleString()} characters) — review
                  and edit before saving
                </Label>
                <Textarea
                  rows={10}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="bg-background font-mono text-xs"
                />
                {preview.textQuality === "low" && (
                  <p className="text-xs text-amber-700">
                    Low text quality — the extraction looks incomplete. Add the missing
                    sections above before saving if possible.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm &amp; save source
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPreview(null);
                  setError(null);
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
