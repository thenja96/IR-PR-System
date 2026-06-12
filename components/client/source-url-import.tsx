"use client";

// URL Import tab of the Source Intelligence Centre.
// Step 1: paste a URL → server fetches and returns a preview (nothing saved).
// Step 2: user reviews title/type/tier/text → confirms → /api/sources/import.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Link2, CheckCircle2 } from "lucide-react";
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
  const [pastedPdfText, setPastedPdfText] = useState("");

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
      setPastedPdfText("");
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
      const extractedText =
        preview.contentType === "pdf" ? pastedPdfText.trim() : preview.extractedText;
      const res = await fetch("/api/sources/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          documentType,
          companyId: companyId || null,
          sourceDate: sourceDate || null,
          extractedText,
          url: preview.url,
          domain: preview.domain,
          trustTier,
          retrievalStatus:
            preview.contentType === "pdf" && extractedText
              ? "manual"
              : preview.retrievalStatus,
          author: preview.author,
          publication: preview.publication,
          language: preview.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setSuccess("Source saved to the library.");
      setPreview(null);
      setUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-primary" /> Import from URL
        </CardTitle>
        <CardDescription>
          Paste a link from Bursa Malaysia, a company website, a press release page, a
          report PDF, an investor deck, or a media article. The page is fetched
          server-side and you confirm a preview before anything is saved.
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
            Fetch preview
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
              <Badge variant={TIER_BADGE_VARIANTS[trustTier]}>
                {TRUST_TIER_LABELS[trustTier]}
              </Badge>
              <Badge variant="outline">{preview.domain}</Badge>
              {preview.contentType === "pdf" && <Badge variant="warning">PDF — link only</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{preview.trustTierReason}</p>
            {preview.note && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">{preview.note}</p>
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

            {preview.contentType === "pdf" ? (
              <div className="space-y-1.5">
                <Label>Paste key sections from the PDF (recommended)</Label>
                <Textarea
                  rows={6}
                  value={pastedPdfText}
                  onChange={(e) => setPastedPdfText(e.target.value)}
                  placeholder="Phase 1 cannot extract PDF text automatically. Paste the relevant sections here so the AI can analyse and cite them…"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>
                  Extracted text preview ({preview.textLength.toLocaleString()} characters captured)
                </Label>
                <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border bg-background p-3 text-xs text-muted-foreground">
                  {preview.textPreview}
                  {preview.textLength > preview.textPreview.length && "…"}
                </div>
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
