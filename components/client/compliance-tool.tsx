"use client";

// Two-stage compliance tool: instant rule-based scan in the browser,
// then an optional AI rewrite via the server-side compliance_rewrite prompt.

import { useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/shared/markdown";
import { CopyButton } from "@/components/shared/copy-button";
import { checkCompliance } from "@/lib/compliance/checker";
import type { ComplianceResult, AnalyzeResponseBody } from "@/types/ai";

export function ComplianceTool() {
  const [draft, setDraft] = useState("");
  const [scan, setScan] = useState<ComplianceResult | null>(null);
  const [aiResult, setAiResult] = useState<AnalyzeResponseBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleScan() {
    setScan(checkCompliance(draft));
    setAiResult(null);
  }

  async function handleAiRewrite() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: "compliance_rewrite",
          inputs: { draft_text: draft },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Rewrite failed.");
      setAiResult(data as AnalyzeResponseBody);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draft to check</CardTitle>
          <CardDescription>
            Step 1 runs an instant rule-based scan for banned phrases. Step 2
            asks the AI verifier model to rewrite the draft into compliant,
            balanced wording.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client-facing draft</Label>
            <Textarea
              rows={10}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste the press release, IR note, or report draft…"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleScan} disabled={!draft.trim()}>
              <ShieldCheck className="h-4 w-4" /> Rule-based scan
            </Button>
            <Button
              variant="outline"
              onClick={handleAiRewrite}
              disabled={!draft.trim() || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-purple-600" />
              )}
              AI compliance rewrite
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {scan && (
        <Card className={scan.hasViolations ? "border-amber-300" : "border-teal-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {scan.hasViolations ? (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Issues found
                  <Badge variant="warning">{scan.violations.length} rule(s)</Badge>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  No banned language detected
                </>
              )}
            </CardTitle>
          </CardHeader>
          {scan.hasViolations && (
            <CardContent className="space-y-4">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {scan.violations.map((v) => (
                  <li key={v.phrase}>
                    <span className="font-medium">“{v.phrase}”</span> ({v.count}
                    ×) — replace with: <em>{v.suggestion}</em>
                  </li>
                ))}
              </ul>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Auto-sanitized version</p>
                  <CopyButton text={scan.sanitizedText} />
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                  {scan.sanitizedText}
                </pre>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {aiResult && (
        <Card className="border-purple-200">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-base">
                AI Compliance Rewrite <Badge variant="ai">AI-generated</Badge>
              </CardTitle>
              <CardDescription>Model: {aiResult.modelUsed}</CardDescription>
            </div>
            <CopyButton text={aiResult.markdown} label="Copy" />
          </CardHeader>
          <CardContent>
            <Markdown content={aiResult.markdown} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
