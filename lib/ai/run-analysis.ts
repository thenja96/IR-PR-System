// Server-side analysis pipeline:
// template → interpolate → OpenRouter → compliance scan (client workspace)
// → log to ai_analysis_runs.

import { createClient } from "@/lib/supabase/server";
import { chatCompletion, resolveModel } from "@/lib/openrouter/client";
import { getTemplate } from "@/lib/prompts/templates";
import { checkCompliance } from "@/lib/compliance/checker";
import { checkPrCompliance } from "@/lib/compliance/pr-checker";
import { sanitizePrDraft } from "@/lib/compliance/pr-cleanup";
import type {
  AnalysisType,
  AnalyzeResponseBody,
  ComplianceResult,
} from "@/types/ai";

function interpolate(template: string, inputs: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = inputs[key];
    return value && value.trim().length > 0 ? value : "Missing Information";
  });
}

export async function runAnalysis(params: {
  analysisType: AnalysisType;
  inputs: Record<string, string>;
  userId: string;
  workspaceId?: string;
  companyId?: string;
}): Promise<AnalyzeResponseBody> {
  const { analysisType, inputs, userId, workspaceId, companyId } = params;
  const template = getTemplate(analysisType);

  // Compliance pre-scan: feed rule-based findings into the rewrite prompt.
  const enrichedInputs = { ...inputs };
  if (analysisType === "compliance_rewrite" && inputs.draft_text) {
    const preScan = checkCompliance(inputs.draft_text);
    enrichedInputs.flagged_issues = preScan.hasViolations
      ? preScan.violations
          .map((v) => `- "${v.phrase}" (${v.count}x) → ${v.suggestion}`)
          .join("\n")
      : "No banned phrases detected by the rule-based scan.";
  }

  const userPrompt = interpolate(template.userPromptTemplate, enrichedInputs);
  const model = resolveModel(template.modelPurpose);

  const result = await chatCompletion({
    model,
    messages: [
      { role: "system", content: template.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: template.temperature ?? 0.4,
    maxTokens: 4000,
  });

  // "Fix Draft" rewrites get a deterministic safety pass AFTER the AI
  // rewrite: every hard-banned phrase is mechanically replaced and unmapped
  // RM/% claims are marked "(requires verification)". The compliance re-check
  // below then runs on the CLEANED text, so the displayed flags are final.
  let finalContent = result.content;
  if (analysisType === "press_release_fix") {
    finalContent = sanitizePrDraft(result.content).text;
  }

  // Compliance gate: every client-workspace output is scanned. Violations are
  // surfaced to the UI; the sanitized version is offered alongside.
  let compliance: ComplianceResult | null = null;
  if (template.workspaceType === "client_ir_pr") {
    compliance = checkCompliance(finalContent);
    // PR Compliance Checker v2: mechanical banned-phrase / quote-safety /
    // source-mapping rules specific to press release output. Flag-only.
    if (analysisType === "press_release_builder" || analysisType === "press_release_fix") {
      const prViolations = checkPrCompliance(finalContent);
      if (prViolations.length > 0) {
        compliance = {
          hasViolations: true,
          violations: [...compliance.violations, ...prViolations],
          sanitizedText: compliance.sanitizedText,
        };
      }
    }
  }

  // Log the run. Failure to log must not lose the analysis result.
  let runId: string | null = null;
  try {
    const supabase = createClient();

    let resolvedWorkspaceId = workspaceId ?? null;
    if (!resolvedWorkspaceId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("workspace_type", template.workspaceType)
        .limit(1)
        .maybeSingle();
      resolvedWorkspaceId = ws?.id ?? null;
    }

    const inputSummary = Object.entries(inputs)
      .map(([k, v]) => `${k}: ${v.slice(0, 150)}`)
      .join(" | ")
      .slice(0, 1000);

    const { data: run } = await supabase
      .from("ai_analysis_runs")
      .insert({
        workspace_id: resolvedWorkspaceId,
        company_id: companyId ?? null,
        analysis_type: analysisType,
        model_used: result.modelUsed,
        input_summary: inputSummary,
        output_markdown: finalContent,
        output_json: compliance
          ? { compliance_violations: compliance.violations }
          : null,
        status: "completed",
        created_by: userId,
      })
      .select("id")
      .single();
    runId = run?.id ?? null;
  } catch (err) {
    console.error("Failed to log ai_analysis_run:", err);
  }

  return {
    markdown: finalContent,
    modelUsed: result.modelUsed,
    runId,
    compliance,
  };
}
