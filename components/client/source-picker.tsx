"use client";

// Multi-select picker for saved source_documents linked to a company.
// Used by AnalysisRunner on client IR/PR modules: selected ids are sent to
// /api/ai/analyze, where the server builds the "Selected Source Documents"
// context. Link-only sources (no extracted text) cannot be selected.

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookMarked, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import {
  TRUST_TIER_SHORT_LABELS,
  tierForDocumentType,
  type SourceTrustTier,
} from "@/lib/sources/trust-tier";

const TIER_BADGE_VARIANTS: Record<SourceTrustTier, "success" | "info" | "warning" | "secondary"> = {
  tier_1: "success",
  tier_2: "info",
  tier_3: "warning",
  tier_4: "secondary",
};

const BASE_COLUMNS =
  "id, document_title, document_type, source_date, extracted_text";
const INTEL_COLUMNS = ", source_trust_tier, retrieval_status, source_domain";

interface PickerSource {
  id: string;
  document_title: string;
  document_type: string;
  source_date: string | null;
  extracted_text: string | null;
  source_trust_tier?: string | null;
  retrieval_status?: string | null;
  source_domain?: string | null;
}

export function SourcePicker({
  companyId,
  selectedIds,
  onChange,
}: {
  companyId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [sources, setSources] = useState<PickerSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const query = (columns: string) =>
        supabase
          .from("source_documents")
          .select(columns)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(50);

      let { data, error } = await query(BASE_COLUMNS + INTEL_COLUMNS);
      if (error) {
        // Migration 0002 not applied — fall back to base columns.
        ({ data, error } = await query(BASE_COLUMNS));
      }
      if (!cancelled) {
        setSources(error ? [] : ((data ?? []) as unknown as PickerSource[]));
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <Card className="border-teal-200/70 bg-teal-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookMarked className="h-4 w-4 text-teal-600" /> Saved sources
          {selectedIds.length > 0 && (
            <Badge variant="success">{selectedIds.length} selected</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Select saved sources to send to the AI as “Selected Source Documents”.
          Anything you type below is added as “Additional User Notes”.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading saved sources…
          </p>
        ) : sources.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No saved sources for this company yet. Add them in the{" "}
            <Link href="/client/source-library" className="font-medium text-teal-700 hover:underline">
              Source Intelligence Centre
            </Link>{" "}
            (link the source to this company when saving).
          </p>
        ) : (
          <ul className="divide-y rounded-md border bg-background">
            {sources.map((src) => {
              const tier = (src.source_trust_tier ??
                tierForDocumentType(src.document_type)) as SourceTrustTier;
              const hasText = Boolean(src.extracted_text?.trim());
              const selected = selectedIds.includes(src.id);
              const expanded = expandedId === src.id;
              return (
                <li key={src.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id={`src-${src.id}`}
                      checked={selected}
                      disabled={!hasText}
                      onChange={() => toggle(src.id)}
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-teal-600 disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`src-${src.id}`}
                        className={cn(
                          "block cursor-pointer text-sm font-medium leading-snug",
                          !hasText && "cursor-not-allowed text-muted-foreground"
                        )}
                      >
                        {src.document_title}
                      </label>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant={TIER_BADGE_VARIANTS[tier] ?? "secondary"}>
                          {TRUST_TIER_SHORT_LABELS[tier] ?? tier}
                        </Badge>
                        <Badge variant="info">{src.document_type.replace(/_/g, " ")}</Badge>
                        {!hasText && <Badge variant="warning">no text — cannot select</Badge>}
                        {src.source_domain && <span>{src.source_domain}</span>}
                        <span>{src.retrieval_status ?? "manual"}</span>
                        {src.source_date && <span>{formatDate(src.source_date)}</span>}
                      </div>
                      {expanded && hasText && (
                        <div className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                          {src.extracted_text!.slice(0, 600)}
                          {src.extracted_text!.length > 600 && "…"}
                        </div>
                      )}
                    </div>
                    {hasText && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : src.id)}
                        className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={expanded ? "Hide excerpt" : "Show excerpt"}
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                        />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
