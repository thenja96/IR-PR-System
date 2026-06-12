"use client";

// Generic AI module runner: renders a config-driven form, calls the
// server-side /api/ai/analyze route, and shows the Markdown result with
// compliance flags and a copy button. Powers most AI module pages.

import { useEffect, useState } from "react";
import {
  Loader2,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  ChevronDown,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/shared/markdown";
import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";
import type { ModuleConfig, AnalyzeResponseBody } from "@/types/ai";

// Loaded on demand so private-market pages (which never show the picker)
// don't carry the Supabase client in their bundle.
const SourcePicker = dynamic(
  () => import("@/components/client/source-picker").then((m) => m.SourcePicker),
  { ssr: false }
);

export function AnalysisRunner({
  module,
  companyId,
  initialValues,
  hideCard,
}: {
  module: ModuleConfig;
  companyId?: string;
  initialValues?: Record<string, string>;
  hideCard?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    initialValues ?? {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponseBody | null>(null);
  const [showSanitized, setShowSanitized] = useState(false);
  const [showViolations, setShowViolations] = useState(false);

  // Saved-source support (client IR/PR modules with a sourceContextField only).
  // On company detail pages companyId comes in as a prop; on standalone pages
  // the user picks a company here to load its saved sources.
  const supportsSources =
    module.workspaceType === "client_ir_pr" && Boolean(module.sourceContextField);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [internalCompanyId, setInternalCompanyId] = useState("");
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const effectiveCompanyId = companyId ?? (internalCompanyId || undefined);
  const showCompanySelect = supportsSources && !companyId;

  useEffect(() => {
    if (!showCompanySelect) return;
    let cancelled = false;
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient()
        .from("companies")
        .select("id, company_name")
        .order("company_name")
        .then(({ data }) => {
          if (!cancelled) setCompanies(data ?? []);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [showCompanySelect]);

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleCompanySelect(id: string) {
    setInternalCompanyId(id);
    setSelectedSourceIds([]);
    // Pre-fill the company name field unless the user already typed one.
    const company = companies.find((c) => c.id === id);
    if (company && module.fields.some((f) => f.name === "company_name")) {
      setValues((prev) =>
        prev.company_name?.trim() ? prev : { ...prev, company_name: company.company_name }
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setShowSanitized(false);
    setShowViolations(false);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: module.analysisType,
          inputs: values,
          companyId: effectiveCompanyId,
          selectedSourceIds:
            selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setResult(data as AnalyzeResponseBody);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  const displayedMarkdown =
    result && showSanitized && result.compliance
      ? result.compliance.sanitizedText
      : result?.markdown ?? "";

  const violationCount = result?.compliance?.violations.length ?? 0;

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {supportsSources && (
        <div className="space-y-3">
          {showCompanySelect && (
            <div className="space-y-1.5">
              <Label htmlFor={`${module.analysisType}-company`}>
                Company (loads saved sources)
              </Label>
              <Select
                id={`${module.analysisType}-company`}
                value={internalCompanyId}
                onChange={(e) => handleCompanySelect(e.target.value)}
              >
                <option value="">— Manual input only —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {effectiveCompanyId && (
            <SourcePicker
              companyId={effectiveCompanyId}
              selectedIds={selectedSourceIds}
              onChange={setSelectedSourceIds}
            />
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {module.fields.map((field) => {
          const isWide = field.type === "textarea";
          // The source-context field becomes optional notes once saved
          // sources are selected; manual-only use is unchanged.
          const isSourceTarget =
            supportsSources &&
            field.name === module.sourceContextField &&
            Boolean(effectiveCompanyId);
          const label = isSourceTarget
            ? "Additional notes / manual source text"
            : field.label;
          const required =
            field.required && !(isSourceTarget && selectedSourceIds.length > 0);
          return (
            <div
              key={field.name}
              className={cn("space-y-1.5", isWide && "sm:col-span-2")}
            >
              <Label htmlFor={field.name}>
                {label}
                {required && (
                  <span className="ml-0.5 text-red-500">*</span>
                )}
              </Label>
              {field.type === "textarea" ? (
                <>
                  <Textarea
                    id={field.name}
                    rows={field.rows ?? 5}
                    placeholder={field.placeholder}
                    required={required}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                  />
                  {isSourceTarget && selectedSourceIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedSourceIds.length} saved source
                      {selectedSourceIds.length > 1 ? "s" : ""} will be sent as
                      “Selected Source Documents”; this text is included as
                      “Additional User Notes”.
                    </p>
                  )}
                </>
              ) : field.type === "select" ? (
                <Select
                  id={field.name}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type === "date" ? "date" : "text"}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />{" "}
            {module.submitLabel ?? "Run analysis"}
          </>
        )}
      </Button>
    </form>
  );

  return (
    <div className="space-y-5">
      {hideCard ? (
        form
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-50">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              </span>
              {module.title}
            </CardTitle>
            <CardDescription>{module.description}</CardDescription>
          </CardHeader>
          <CardContent>{form}</CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-red-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
              Generating analysis…
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="overflow-hidden border-purple-200/80">
          {/* Output toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b bg-gradient-to-r from-purple-50/80 to-transparent px-4 py-2.5 sm:px-5">
            <Badge variant="ai" className="gap-1">
              <Sparkles className="h-3 w-3" /> AI-generated
            </Badge>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              <Cpu className="h-3 w-3" />
              {result.modelUsed}
            </span>
            {result.compliance &&
              (result.compliance.hasViolations ? (
                <button
                  type="button"
                  onClick={() => setShowViolations(!showViolations)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-200"
                >
                  <ShieldAlert className="h-3 w-3" />
                  {violationCount} compliance flag{violationCount > 1 ? "s" : ""}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      showViolations && "rotate-180"
                    )}
                  />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                  <ShieldCheck className="h-3 w-3" /> Compliance passed
                </span>
              ))}
            <div className="ml-auto">
              <CopyButton text={displayedMarkdown} label="Copy Markdown" />
            </div>
          </div>

          {/* Compliance details */}
          {result.compliance?.hasViolations && showViolations && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm sm:px-5">
              <ul className="list-disc space-y-1 pl-5 text-amber-800">
                {result.compliance.violations.map((v) => (
                  <li key={v.phrase}>
                    “{v.phrase}” ({v.count}×) — suggested: {v.suggestion}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5 bg-background"
                onClick={() => setShowSanitized(!showSanitized)}
              >
                {showSanitized
                  ? "Show original output"
                  : "Show sanitized version"}
              </Button>
            </div>
          )}

          <CardContent className="p-4 pt-4 sm:p-6 sm:pt-5">
            {showSanitized && (
              <p className="mb-3 inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                Viewing sanitized version
              </p>
            )}
            <Markdown content={displayedMarkdown} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
