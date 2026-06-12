// Core database row types mirroring supabase/migrations/0001_init.sql

export type UserRole = "admin" | "analyst" | "writer" | "viewer";
export type WorkspaceType = "client_ir_pr" | "private_market";
export type WorkspaceVisibility = "team" | "private_only";

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  workspace_name: string;
  workspace_type: WorkspaceType;
  visibility: WorkspaceVisibility;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  company_name: string;
  stock_code: string | null;
  bursa_market: string | null;
  sector: string | null;
  business_description: string | null;
  client_status: string | null;
  assigned_pic: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyPeer {
  id: string;
  company_id: string;
  peer_company_name: string;
  peer_stock_code: string | null;
  peer_sector: string | null;
  reason_for_comparison: string | null;
  created_at: string;
}

export type DocumentType =
  | "annual_report"
  | "quarterly_report"
  | "investor_deck"
  | "bursa_announcement"
  | "press_release"
  | "media_article"
  | "price_volume_csv"
  | "macro_note"
  | "trading_note"
  | "other";

// Source Intelligence (migration 0002)
export type SourceTrustTier = "tier_1" | "tier_2" | "tier_3" | "tier_4";
export type RetrievalStatus = "manual" | "fetched" | "fetch_failed" | "pdf_link_only";

export interface SourceCitation {
  title: string;
  url: string | null;
  domain: string | null;
  publication: string | null;
  author: string | null;
  source_date: string | null;
  trust_tier: SourceTrustTier;
  retrieved_at: string;
}

export interface SourceDocument {
  id: string;
  workspace_id: string;
  company_id: string | null;
  document_type: DocumentType;
  document_title: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  extracted_text: string | null;
  source_date: string | null;
  uploaded_by: string | null;
  // Source Intelligence fields — null on records created before migration 0002.
  source_url: string | null;
  source_domain: string | null;
  source_trust_tier: SourceTrustTier | null;
  retrieval_status: RetrievalStatus | null;
  retrieved_at: string | null;
  source_author: string | null;
  source_publication: string | null;
  source_language: string | null;
  source_citation: SourceCitation | null;
  created_at: string;
  updated_at: string;
}

export type AssetType =
  | "malaysia_stock"
  | "gold"
  | "us_index"
  | "forex"
  | "bond_yield"
  | "volatility_index"
  | "commodity"
  | "macro";

export interface MarketPrice {
  id: string;
  workspace_id: string;
  asset_symbol: string;
  asset_name: string | null;
  asset_type: AssetType;
  price_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  created_at: string;
}

export interface MarketMetric {
  id: string;
  workspace_id: string;
  asset_symbol: string;
  metric_date: string;
  return_1d: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_ytd: number | null;
  avg_daily_volume_30d: number | null;
  volume_spike_ratio: number | null;
  drawdown: number | null;
  volatility: number | null;
  moving_average_20: number | null;
  moving_average_50: number | null;
  moving_average_200: number | null;
  created_at: string;
}

export interface AiAnalysisRun {
  id: string;
  workspace_id: string | null;
  company_id: string | null;
  analysis_type: string;
  model_used: string | null;
  input_summary: string | null;
  output_json: Record<string, unknown> | null;
  output_markdown: string | null;
  status: "completed" | "failed" | "running";
  created_by: string | null;
  created_at: string;
}

export type OpportunityType =
  | "press_release"
  | "investor_deck_refresh"
  | "analyst_briefing"
  | "media_interview"
  | "board_management_summary"
  | "peer_benchmarking"
  | "whatsapp_investor_update"
  | "crisis_monitoring"
  | "monthly_ir_report"
  | "result_ir_pack"
  | "esg_pr_angle"
  | "investor_visibility_campaign";

export interface ClientOpportunity {
  id: string;
  workspace_id: string;
  company_id: string;
  opportunity_title: string;
  opportunity_type: OpportunityType;
  opportunity_score: number | null;
  why_now: string | null;
  suggested_service: string | null;
  proposed_fee_range: string | null;
  supporting_evidence: string | null;
  status: "open" | "proposed" | "won" | "lost" | "dropped";
  created_at: string;
  updated_at: string;
}

export type AlertLevel = "low" | "medium" | "high" | "urgent";

export interface Alert {
  id: string;
  workspace_id: string;
  company_id: string | null;
  alert_type: string;
  alert_title: string;
  alert_level: AlertLevel;
  alert_summary: string | null;
  suggested_action: string | null;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
  updated_at: string;
}

export interface TradingJournalEntry {
  id: string;
  workspace_id: string;
  trade_date: string;
  asset_symbol: string;
  direction: "long" | "short";
  entry_price: number | null;
  exit_price: number | null;
  position_size: string | null;
  reason_for_entry: string | null;
  reason_for_exit: string | null;
  emotion_before: string | null;
  emotion_after: string | null;
  result: string | null;
  lesson: string | null;
  screenshot_url: string | null;
  ai_review: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplateRow {
  id: string;
  prompt_name: string;
  prompt_category: string;
  workspace_type: WorkspaceType;
  system_prompt: string;
  user_prompt_template: string;
  default_model: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelSetting {
  id: string;
  setting_name: string;
  model_slug: string;
  provider: string | null;
  purpose: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
