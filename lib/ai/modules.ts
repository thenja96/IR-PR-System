// Form configuration for each AI module. Field names MUST match the
// {{placeholders}} in lib/prompts/templates.ts.
// Plain data — safe to import from client components.

import type { ModuleConfig } from "@/types/ai";
import { CLIENT_REPORT_TYPES, PRIVATE_REPORT_TYPES } from "@/types/reports";

export const MODULES: Record<string, ModuleConfig> = {
  company_snapshot: {
    analysisType: "company_snapshot",
    sourceContextField: "source_text",
    title: "Company Snapshot",
    description:
      "Generate an institutional-quality snapshot from source documents.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "stock_code", label: "Stock code", type: "text" },
      { name: "sector", label: "Sector", type: "text" },
      { name: "source_text", label: "Source material", type: "textarea", rows: 10, required: true, placeholder: "Paste annual report extract, announcement, or company description…" },
    ],
  },

  bursa_announcement: {
    analysisType: "bursa_announcement",
    sourceContextField: "announcement_text",
    title: "Bursa Announcement Radar",
    description:
      "Paste a Bursa announcement to classify it, assess impact, and get a suggested IR/PR response.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "announcement_text", label: "Announcement text", type: "textarea", rows: 12, required: true, placeholder: "Paste the full Bursa announcement text…" },
    ],
    submitLabel: "Analyse announcement",
  },

  competitor_intelligence: {
    analysisType: "competitor_intelligence",
    sourceContextField: "client_context",
    title: "Competitor Intelligence",
    description:
      "Compare peer activity against your client and identify gaps and responses.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Client company", type: "text", required: true },
      { name: "client_context", label: "Client context", type: "textarea", rows: 5, required: true, placeholder: "Latest client results, story, deck status, media visibility…" },
      { name: "peer_updates", label: "Peer updates & data", type: "textarea", rows: 10, required: true, placeholder: "Paste peer announcements, results, media coverage — one peer per paragraph…" },
    ],
    submitLabel: "Run comparison",
  },

  news_impact: {
    analysisType: "news_impact",
    title: "News Impact Radar",
    description:
      "Assess how a news item affects your clients and what response is needed.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "news_text", label: "News item", type: "textarea", rows: 8, required: true, placeholder: "Paste the news article, headline, or policy announcement…" },
      { name: "affected_clients", label: "Potentially affected clients", type: "textarea", rows: 4, placeholder: "Client names with one line of context each…" },
    ],
    submitLabel: "Assess impact",
  },

  investor_concern: {
    analysisType: "investor_concern",
    sourceContextField: "source_text",
    title: "Investor Concern Detector",
    description:
      "Generate the top investor questions with CEO/CFO answers and briefing versions.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "source_text", label: "Source material", type: "textarea", rows: 12, required: true, placeholder: "Paste the latest result, announcement, annual report section, or deck content…" },
    ],
    submitLabel: "Detect concerns",
  },

  ir_angle: {
    analysisType: "ir_angle",
    sourceContextField: "source_text",
    title: "IR Angle Lab",
    description:
      "Generate investor angles, talking points, and deck messages with evidence and cautions.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "source_text", label: "Source material", type: "textarea", rows: 10, required: true },
      { name: "focus", label: "Specific focus (optional)", type: "text", placeholder: "e.g. order book growth, margin recovery" },
    ],
    submitLabel: "Generate IR angles",
  },

  pr_angle: {
    analysisType: "pr_angle",
    sourceContextField: "story_context",
    title: "PR & Media Angle Generator",
    description:
      "Generate press release, media, and community angles tuned for Malaysian outlets.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "story_context", label: "Story context", type: "textarea", rows: 8, required: true, placeholder: "What is the story? Result, contract, expansion, milestone…" },
      { name: "target_outlets", label: "Target outlets (optional)", type: "text", placeholder: "e.g. The Edge, The Star, Chinese media" },
    ],
    submitLabel: "Generate PR angles",
  },

  add_on_opportunity: {
    analysisType: "add_on_opportunity",
    sourceContextField: "recent_developments",
    title: "Add-On Opportunity Engine",
    description:
      "Score and rank add-on service opportunities with fee ranges and client-ready messages.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Client company", type: "text", required: true },
      { name: "recent_developments", label: "Recent developments", type: "textarea", rows: 8, required: true, placeholder: "Results, announcements, price/volume moves, competitor actions, deck age, media exposure…" },
      { name: "current_services", label: "Current services (optional)", type: "text", placeholder: "e.g. monthly retainer, quarterly PR" },
    ],
    submitLabel: "Score opportunities",
  },

  analyst_qna: {
    analysisType: "analyst_qna",
    sourceContextField: "source_text",
    title: "Analyst Q&A Builder",
    description:
      "Build a CEO/CFO-ready analyst briefing pack with sensitive questions flagged.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "source_text", label: "Source material", type: "textarea", rows: 12, required: true },
    ],
    submitLabel: "Build Q&A pack",
  },

  client_monthly_value_report: {
    analysisType: "client_monthly_value_report",
    title: "Client Monthly Value Report",
    description:
      "Generate the monthly report that proves Aegis' value and supports renewal.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Client company", type: "text", required: true },
      { name: "month", label: "Month", type: "text", required: true, placeholder: "e.g. June 2026" },
      { name: "deliverables", label: "Completed deliverables", type: "textarea", rows: 5, required: true },
      { name: "market_summary", label: "Market / media / competitor context", type: "textarea", rows: 8, required: true },
    ],
    submitLabel: "Generate report",
  },

  crisis_monitor: {
    analysisType: "crisis_monitor",
    title: "Crisis & Reputation Monitor",
    description:
      "Assess a reputation issue and draft a holding statement for management review.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "issue_description", label: "Issue description", type: "textarea", rows: 10, required: true, placeholder: "Describe the negative media, governance issue, market activity, or complaint…" },
    ],
    submitLabel: "Assess risk",
  },

  report_builder_client: {
    analysisType: "report_builder_client",
    sourceContextField: "context",
    title: "Report Builder",
    description: "Generate client-ready Markdown deliverables.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "report_type", label: "Report type", type: "select", required: true, options: [...CLIENT_REPORT_TYPES] },
      { name: "company_name", label: "Company name", type: "text", required: true },
      { name: "context", label: "Context & source material", type: "textarea", rows: 12, required: true, placeholder: "Paste analysis output, announcement text, financial highlights — everything the report should be based on…" },
    ],
    submitLabel: "Generate report",
  },

  // ── Phase 4A — PR/IR deliverable builders ───────────────────
  press_release_builder: {
    analysisType: "press_release_builder",
    sourceContextField: "source_text",
    title: "Press Release Builder",
    description:
      "Draft a client-ready press release package — headlines, full draft, quotes, and key messages — from saved sources.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      {
        name: "announcement_type",
        label: "Announcement / development type",
        type: "select",
        required: true,
        options: [
          "Financial results",
          "Contract win / order book",
          "MOU / partnership",
          "Acquisition / disposal",
          "New product / service launch",
          "Expansion / new facility",
          "Leadership appointment",
          "Dividend announcement",
          "ESG / sustainability initiative",
          "Corporate milestone",
          "Other",
        ],
      },
      { name: "strategic_angle", label: "Preferred strategic angle (optional)", type: "text", placeholder: "e.g. recurring income growth, regional expansion" },
      { name: "quote_direction", label: "Quote direction (optional)", type: "text", placeholder: "e.g. confident but measured, focus on execution discipline" },
      { name: "target_media", label: "Target media audience (optional)", type: "text", placeholder: "e.g. The Edge, StarBiz, Chinese business media" },
      { name: "source_text", label: "Source material / development details", type: "textarea", rows: 10, required: true, placeholder: "Paste the announcement, results extract, or development details — or select saved sources above…" },
    ],
    submitLabel: "Draft press release",
  },

  // Internal: powers the "Fix Draft" action on Press Release Builder output.
  // Not linked in navigation — invoked programmatically with the original
  // output and detected violations; sourceContextField lets the analyze route
  // re-inject the originally selected sources as ground truth.
  press_release_fix: {
    analysisType: "press_release_fix",
    sourceContextField: "source_context",
    title: "Press Release Compliance Fix",
    description: "Cleans a generated press release draft against PR compliance findings.",
    workspaceType: "client_ir_pr",
    fields: [],
  },

  media_interview_qna: {
    analysisType: "media_interview_qna",
    sourceContextField: "source_text",
    title: "Media Interview Q&A Builder",
    description:
      "Prepare a spokesperson for a media interview — likely questions, tough questions, holding lines, and safe wording.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Company name", type: "text", required: true },
      {
        name: "spokesperson",
        label: "Spokesperson",
        type: "select",
        required: true,
        options: ["CEO", "CFO", "Chairman", "Managing Director"],
      },
      { name: "interview_context", label: "Interview context", type: "textarea", rows: 4, required: true, placeholder: "Occasion, recent events, expected topics — e.g. post-results media session after Q2 announcement…" },
      { name: "target_outlet", label: "Target outlet / journalist type (optional)", type: "text", placeholder: "e.g. The Edge senior writer, business desk reporter, TV business segment" },
      { name: "source_text", label: "Source material", type: "textarea", rows: 8, required: true, placeholder: "Paste the latest results, announcements, or background — or select saved sources above…" },
    ],
    submitLabel: "Build interview pack",
  },

  activity_proposal_builder: {
    analysisType: "activity_proposal_builder",
    sourceContextField: "source_text",
    title: "Activity Proposal Builder",
    description:
      "Draft a concrete IR/PR activity proposal — rationale, structure, timeline, deliverables, and value — ready to present to the client.",
    workspaceType: "client_ir_pr",
    fields: [
      { name: "company_name", label: "Client company", type: "text", required: true },
      {
        name: "activity_type",
        label: "Activity type",
        type: "select",
        required: true,
        options: [
          "Analyst briefing",
          "Media briefing",
          "Fund manager meeting",
          "Signing ceremony",
          "AGM / EGM",
          "Investor day",
          "Stakeholder engagement event",
          "Digital / social campaign",
        ],
      },
      { name: "objective", label: "Objective", type: "text", required: true, placeholder: "e.g. rebuild analyst coverage after two quiet quarters" },
      { name: "target_audience", label: "Target audience (optional)", type: "text", placeholder: "e.g. sell-side analysts, fund managers, business media" },
      { name: "source_text", label: "Company context & recent developments", type: "textarea", rows: 8, required: true, placeholder: "Paste recent results, announcements, or context — or select saved sources above…" },
    ],
    submitLabel: "Draft proposal",
  },

  // ── Private market ──────────────────────────────────────────
  gold_market_regime: {
    analysisType: "gold_market_regime",
    title: "AI Market Regime",
    description:
      "Classify the current gold regime with confirmation and invalidation signals.",
    workspaceType: "private_market",
    fields: [
      { name: "market_data", label: "Market data", type: "textarea", rows: 8, required: true, placeholder: "Gold price & recent move, DXY, US 2Y/10Y yields, VIX, index levels…" },
      { name: "recent_news", label: "Recent news / macro context", type: "textarea", rows: 5, placeholder: "Fed speak, data releases, geopolitical events…" },
    ],
    submitLabel: "Classify regime",
  },

  gold_technical_structure: {
    analysisType: "gold_technical_structure",
    title: "Technical Structure",
    description:
      "Analyse trend, structure, and key levels — confirmation language only, no trade calls.",
    workspaceType: "private_market",
    fields: [
      { name: "price_action_notes", label: "Price action data & notes", type: "textarea", rows: 12, required: true, placeholder: "Levels, OHLC, MAs, RSI/ATR, session behaviour, previous day high/low…" },
    ],
    submitLabel: "Analyse structure",
  },

  macro_event_scenario: {
    analysisType: "macro_event_scenario",
    title: "Scenario Planner",
    description:
      "Pre-plan above / below / in-line scenarios for a macro event.",
    workspaceType: "private_market",
    fields: [
      { name: "event_name", label: "Event", type: "text", required: true, placeholder: "e.g. US CPI, FOMC, NFP" },
      { name: "event_date", label: "Date / time", type: "text", required: true, placeholder: "e.g. 18 Jun 2026, 8:30pm MYT" },
      { name: "consensus", label: "Consensus / expectation", type: "text", placeholder: "e.g. CPI 3.1% YoY expected" },
      { name: "context", label: "Current market context", type: "textarea", rows: 6, required: true },
    ],
    submitLabel: "Build scenarios",
  },

  private_news_impact: {
    analysisType: "private_news_impact",
    title: "Real-Time News Impact",
    description: "Paste a headline to assess its impact on gold, DXY, and yields.",
    workspaceType: "private_market",
    fields: [
      { name: "news_text", label: "News headline / summary", type: "textarea", rows: 6, required: true },
    ],
    submitLabel: "Analyse impact",
  },

  us_index_summary: {
    analysisType: "us_index_summary",
    title: "US Index Risk Summary",
    description: "Risk-on/risk-off read across US indices, VIX, and DXY.",
    workspaceType: "private_market",
    fields: [
      { name: "market_data", label: "Index & risk data", type: "textarea", rows: 8, required: true, placeholder: "S&P 500, Nasdaq, Dow, VIX, DXY, US 10Y levels and recent moves…" },
    ],
    submitLabel: "Summarise",
  },

  trading_journal_review: {
    analysisType: "trading_journal_review",
    title: "Trading Journal Review",
    description: "An honest AI review of a recorded trade.",
    workspaceType: "private_market",
    fields: [
      { name: "trade_details", label: "Trade details", type: "textarea", rows: 10, required: true },
      { name: "market_context", label: "Market context at the time", type: "textarea", rows: 3 },
    ],
    submitLabel: "Review trade",
  },

  risk_discipline_check: {
    analysisType: "risk_discipline_check",
    title: "Risk Discipline Coach",
    description: "Pre-trade checklist — answer honestly before entering.",
    workspaceType: "private_market",
    fields: [
      { name: "news_soon", label: "Is there major news soon?", type: "select", required: true, options: ["No major news", "News within 24 hours", "News within 2 hours", "Not sure"] },
      { name: "alignment", label: "Is gold aligned with DXY and yields?", type: "select", required: true, options: ["Aligned", "Partially aligned", "Conflicting", "Not sure"] },
      { name: "trend_clarity", label: "Is the trend clear or mixed?", type: "select", required: true, options: ["Clear", "Mixed", "Choppy / unclear"] },
      { name: "near_level", label: "Entering near support or resistance?", type: "select", required: true, options: ["Near support", "Near resistance", "Mid-range", "Not sure"] },
      { name: "chasing", label: "Are you chasing after a big move?", type: "select", required: true, options: ["No", "Maybe", "Yes"] },
      { name: "invalidation", label: "Do you have a clear invalidation level?", type: "select", required: true, options: ["Yes, defined", "Roughly", "No"] },
      { name: "losses_today", label: "Multiple losses already today?", type: "select", required: true, options: ["No losses", "One loss", "Two or more losses"] },
      { name: "best_setup", label: "Aligned with your journal's best setup?", type: "select", required: true, options: ["Yes", "Partially", "No", "Not sure"] },
      { name: "context", label: "Trade idea & context", type: "textarea", rows: 4, placeholder: "Describe the setup you are considering…" },
    ],
    submitLabel: "Run risk check",
  },

  weekly_trading_review: {
    analysisType: "weekly_trading_review",
    title: "Weekly Performance Review",
    description: "Review the week's trades for patterns, mistakes, and focus areas.",
    workspaceType: "private_market",
    fields: [
      { name: "trades_summary", label: "This week's trades", type: "textarea", rows: 12, required: true, placeholder: "Paste journal entries or summaries for the week…" },
    ],
    submitLabel: "Review week",
  },

  private_daily_market_note: {
    analysisType: "private_daily_market_note",
    title: "Private Daily Market Note",
    description: "A concise private daily note on gold and macro conditions.",
    workspaceType: "private_market",
    fields: [
      { name: "market_data", label: "Market data", type: "textarea", rows: 6, required: true },
      { name: "notes", label: "Your observations", type: "textarea", rows: 4 },
    ],
    submitLabel: "Generate note",
  },

  report_builder_private: {
    analysisType: "report_builder_private",
    title: "Private Report Builder",
    description: "Generate private market reports in Markdown.",
    workspaceType: "private_market",
    fields: [
      { name: "report_type", label: "Report type", type: "select", required: true, options: [...PRIVATE_REPORT_TYPES] },
      { name: "context", label: "Context, data & notes", type: "textarea", rows: 12, required: true },
    ],
    submitLabel: "Generate report",
  },
};

/**
 * Which input field receives the "Selected Source Documents" context for a
 * given analysis type. Undefined means the module does not support saved
 * sources (all private market modules, and client modules without one).
 */
export function getSourceContextField(analysisType: string): string | undefined {
  return Object.values(MODULES).find((m) => m.analysisType === analysisType)
    ?.sourceContextField;
}
