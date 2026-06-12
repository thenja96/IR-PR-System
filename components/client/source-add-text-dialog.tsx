"use client";

// "Add text" panel for link-only / low-text-quality sources: lets the user
// paste the document text directly onto an existing saved source instead of
// re-importing it. Keeps the original URL and metadata; updates retrieval
// status and usefulness so the source becomes selectable in the Source Picker.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, TriangleAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TRUST_TIER_SHORT_LABELS,
  isOfficialTier1Domain,
  tierForDocumentType,
  usefulnessForDocumentType,
  type SourceTrustTier,
} from "@/lib/sources/trust-tier";

const TIER_BADGE_VARIANTS: Record<SourceTrustTier, "success" | "info" | "warning" | "secondary"> = {
  tier_1: "success",
  tier_2: "info",
  tier_3: "warning",
  tier_4: "secondary",
};

export interface AddTextSource {
  id: string;
  document_title: string;
  document_type: string;
  extracted_text: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  source_trust_tier?: string | null;
  retrieval_status?: string | null;
}

export function SourceAddTextDialog({
  source,
  onClose,
}: {
  source: AddTextSource;
  onClose: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState(source.extracted_text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = (source.source_trust_tier ??
    tierForDocumentType(source.document_type)) as SourceTrustTier;
  const isOfficial =
    Boolean(source.source_url) &&
    (source.source_trust_tier === "tier_1" ||
      isOfficialTier1Domain(source.source_domain ?? ""));

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Paste the document text before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("source_documents")
        .update({
          extracted_text: trimmed,
          retrieval_status: isOfficial ? "manual_with_official_url" : "manual",
          source_usefulness: usefulnessForDocumentType(source.document_type),
          updated_at: new Date().toISOString(),
        })
        .eq("id", source.id);
      if (updateError) throw updateError;
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save text.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug">
                {source.extracted_text ? "Update extracted text" : "Add text to source"}
              </CardTitle>
              <CardDescription className="mt-1">{source.document_title}</CardDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant={TIER_BADGE_VARIANTS[tier] ?? "secondary"}>
              {TRUST_TIER_SHORT_LABELS[tier] ?? tier}
            </Badge>
            <Badge variant="info">{source.document_type.replace(/_/g, " ")}</Badge>
            <Badge variant="outline">
              {(source.retrieval_status ?? "manual").replace(/_/g, " ")}
            </Badge>
          </div>
          {source.source_url && (
            <a
              href={source.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 break-all text-xs text-teal-700 hover:underline"
            >
              {source.source_url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          <div className="space-y-1.5">
            <Label>Paste extracted / announcement text</Label>
            <Textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Open the source in your browser, copy the document text, and paste it here…"
            />
            <p className="text-xs text-muted-foreground">
              The original URL and metadata are kept. After saving, this source becomes
              selectable for AI analysis
              {isOfficial && " and is recorded as manually pasted against the official URL"}
              .
            </p>
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-sm text-red-600">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !text.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save text
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
