import type { WorkspaceType } from "./database";

/** Every analysis the platform can run, keyed for ai_analysis_runs.analysis_type */
export type AnalysisType =
  // Client IR/PR workspace
  | "company_snapshot"
  | "financial_highlights"
  | "bursa_announcement"
  | "competitor_intelligence"
  | "news_impact"
  | "investor_concern"
  | "ir_angle"
  | "pr_angle"
  | "add_on_opportunity"
  | "analyst_qna"
  | "client_monthly_value_report"
  | "crisis_monitor"
  | "compliance_rewrite"
  | "report_builder_client"
  // Phase 4A — PR/IR deliverable builders
  | "press_release_builder"
  | "press_release_fix"
  | "media_interview_qna"
  | "activity_proposal_builder"
  // Private market workspace
  | "gold_market_regime"
  | "gold_technical_structure"
  | "macro_event_scenario"
  | "private_news_impact"
  | "us_index_summary"
  | "trading_journal_review"
  | "risk_discipline_check"
  | "weekly_trading_review"
  | "private_daily_market_note"
  | "report_builder_private";

export type ModelPurpose =
  | "long_analysis"
  | "fast_draft"
  | "final_writing"
  | "verifier";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  retries?: number;
}

export interface ChatCompletionResult {
  content: string;
  modelUsed: string;
}

export interface PromptTemplate {
  analysisType: AnalysisType;
  promptName: string;
  promptCategory: string;
  workspaceType: WorkspaceType;
  systemPrompt: string;
  userPromptTemplate: string;
  /** Human-readable description of the expected output shape */
  expectedOutputSchema: string;
  modelPurpose: ModelPurpose;
  temperature?: number;
}

export interface ComplianceViolation {
  phrase: string;
  count: number;
  suggestion: string;
  /** "hard" = banned phrase / broken quote rule; "warning" = needs review. Unset = legacy trading-language rule. */
  severity?: "hard" | "warning";
  /** Markdown section heading where the first occurrence was found */
  section?: string;
}

export interface ComplianceResult {
  hasViolations: boolean;
  violations: ComplianceViolation[];
  /** Text with banned phrases replaced by compliant wording */
  sanitizedText: string;
}

export interface AnalyzeRequestBody {
  analysisType: AnalysisType;
  inputs: Record<string, string>;
  workspaceId?: string;
  companyId?: string;
  /** Saved source_documents ids to inject as "Selected Source Documents" (client workspace only) */
  selectedSourceIds?: string[];
}

export interface AnalyzeResponseBody {
  markdown: string;
  modelUsed: string;
  runId: string | null;
  compliance: ComplianceResult | null;
}

/** Field definition used by the generic AnalysisRunner form */
export interface ModuleField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "date";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  rows?: number;
}

export interface ModuleConfig {
  analysisType: AnalysisType;
  title: string;
  description: string;
  workspaceType: WorkspaceType;
  fields: ModuleField[];
  submitLabel?: string;
  /**
   * Name of the field that receives the built source context when the user
   * selects saved sources. Also enables the Source Picker for this module.
   * Client IR/PR modules only.
   */
  sourceContextField?: string;
}
