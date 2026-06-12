// Reusable prompt templates for every analysis type.
// Placeholders use {{field_name}} and are interpolated by lib/ai/run-analysis.ts.
// Unfilled placeholders are replaced with "Missing Information" so the model
// is forced to flag gaps instead of inventing data.

import type { AnalysisType, PromptTemplate } from "@/types/ai";
import { CLIENT_SYSTEM_PROMPT, PRIVATE_SYSTEM_PROMPT } from "./system";

export const PROMPT_TEMPLATES: Record<AnalysisType, PromptTemplate> = {
  // ──────────────────────────────────────────────────────────────
  // CLIENT IR/PR WORKSPACE
  // ──────────────────────────────────────────────────────────────
  company_snapshot: {
    analysisType: "company_snapshot",
    promptName: "Company Snapshot",
    promptCategory: "client_analysis",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Create an institutional-quality company snapshot for an IR/PR advisory team.

Company: {{company_name}} (Stock code: {{stock_code}})
Sector: {{sector}}

Source material:
"""
{{source_text}}
"""

Produce:
## Company Snapshot
- Business overview (3-4 bullet points)
- Key business segments and revenue drivers
- Recent developments
## Investor-Relevant Facts
## Communication Watchpoints
## Missing Information
List anything important you could not find in the source material.`,
    expectedOutputSchema:
      "Markdown: Company Snapshot, Investor-Relevant Facts, Communication Watchpoints, Missing Information",
    modelPurpose: "long_analysis",
  },

  financial_highlights: {
    analysisType: "financial_highlights",
    promptName: "Financial Highlights",
    promptCategory: "client_analysis",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Summarise the financial highlights for {{company_name}} for period {{period}}.

Pre-calculated metrics (computed in code — interpret them, do not recalculate):
"""
{{calculated_metrics}}
"""

Source financial data:
"""
{{source_text}}
"""

Produce:
## Financial Highlights
## What Improved / What Weakened
## Likely Investor Questions
## Suggested IR Messaging Points
## Figures Requiring Verification
Mark every figure not present in the source as "requires verification".`,
    expectedOutputSchema:
      "Markdown: Financial Highlights, Improved/Weakened, Investor Questions, IR Messaging, Verification flags",
    modelPurpose: "long_analysis",
  },

  bursa_announcement: {
    analysisType: "bursa_announcement",
    promptName: "Bursa Announcement Analysis",
    promptCategory: "client_analysis",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Analyse this Bursa Malaysia announcement for {{company_name}}.

Announcement text:
"""
{{announcement_text}}
"""

Classify the announcement into one of: financial result, annual report, contract win, MOU / collaboration, acquisition / disposal, private placement, rights issue, dividend, board change, major shareholder change, litigation, related party transaction, ESG / sustainability, AGM / EGM, unusual market activity.

Produce:
## Announcement Summary
## Classification
## Investor Relevance
## Media Relevance
## Risk Level (Low / Medium / High / Urgent) with reasoning
## Likely Investor Questions (5-8)
## Suggested IR/PR Response
State whether a press release, FAQ, media pitch, or investor update is needed.
## Add-On Service Opportunity
Suggest a concrete Aegis service with a why-now rationale.`,
    expectedOutputSchema:
      "Markdown: Summary, Classification, Investor/Media Relevance, Risk Level, Questions, Response, Add-On",
    modelPurpose: "long_analysis",
  },

  competitor_intelligence: {
    analysisType: "competitor_intelligence",
    promptName: "Competitor Intelligence",
    promptCategory: "client_analysis",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Run a competitor intelligence comparison for our client {{company_name}}.

Client context:
"""
{{client_context}}
"""

Peer / competitor updates and data:
"""
{{peer_updates}}
"""

Produce a Markdown table with columns: Peer | Latest Event | Why It Matters | Impact to Client | Suggested IR/PR Response | Possible Add-On.

Then add:
## Narrative Gap Analysis
Where peers are telling a stronger investor story than the client.
## Media Visibility Comparison
## Recommended Client Response
## Missing Information`,
    expectedOutputSchema:
      "Markdown table (Peer, Event, Why It Matters, Impact, Response, Add-On) + gap analysis sections",
    modelPurpose: "long_analysis",
  },

  news_impact: {
    analysisType: "news_impact",
    promptName: "News Impact Radar",
    promptCategory: "client_analysis",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Assess the impact of this news on our clients.

News item:
"""
{{news_text}}
"""

Clients potentially affected (and context):
"""
{{affected_clients}}
"""

Classify impact as one or more of: High Positive, High Negative, Neutral but Relevant, Sector-wide, Competitor-specific, Client-specific, Reputation Risk.

Produce:
## What Happened
## Why It Matters
## Impact Classification
## Which Clients Are Affected
## Investor Concern
## Media Concern
## Suggested Response
## Suggested Add-On Service
## Urgency Level (Low / Medium / High / Urgent)`,
    expectedOutputSchema:
      "Markdown: What Happened, Why It Matters, Classification, Affected Clients, Concerns, Response, Add-On, Urgency",
    modelPurpose: "fast_draft",
  },

  investor_concern: {
    analysisType: "investor_concern",
    promptName: "Investor Concern Detector",
    promptCategory: "client_analysis",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Identify investor concerns for {{company_name}} based on the material below.

Source material (latest result / announcement / annual report / deck):
"""
{{source_text}}
"""

Consider common concern areas: margin decline, revenue concentration, cash flow weakness, high gearing, dividend sustainability, order book visibility, customer concentration, related party transactions, management succession, capex plan, utilisation rate, regulatory risk, ESG concern, share price / volume underperformance, peer comparison weakness.

Produce:
## Top 10 Investor Questions
For each: the question, a suggested CEO answer, and a suggested CFO answer.
## Analyst Briefing Version
Condensed Q&A suitable for an analyst briefing.
## Media-Friendly Version
## Retail Investor Simple Version
## Questions to Avoid Volunteering
## Sensitive Areas Requiring Management Confirmation
## Missing Information`,
    expectedOutputSchema:
      "Markdown: Top 10 Q&A (CEO/CFO answers), analyst/media/retail versions, sensitive areas",
    modelPurpose: "long_analysis",
  },

  ir_angle: {
    analysisType: "ir_angle",
    promptName: "IR Angle Generator",
    promptCategory: "client_content",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Generate IR messaging angles for {{company_name}}.

Source material:
"""
{{source_text}}
"""

Specific focus (if any): {{focus}}

Produce:
## 5 Investor Angles
## 5 Management Talking Points
## 5 Investor Deck Messages
## 5 Market Positioning Messages
## 5 AGM / Analyst Briefing Messages

Each angle must include:
- **Angle title**
- Supporting evidence (cite the source section; mark unsupported points "requires verification")
- Why investors may care
- Risk / caution
- Recommended communication format (deck, briefing, press release, FAQ, etc.)

Finish with a short, a medium, and a detailed version of the single strongest angle.`,
    expectedOutputSchema:
      "Markdown: 5x5 angle sets, each with title, evidence, why-it-matters, risk, format; 3 length versions of the top angle",
    modelPurpose: "final_writing",
  },

  pr_angle: {
    analysisType: "pr_angle",
    promptName: "PR & Media Angle Generator",
    promptCategory: "client_content",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Generate PR and media angles for {{company_name}}.

Story context:
"""
{{story_context}}
"""

Target outlets / channels (if specified): {{target_outlets}}

Produce:
## English Press Release Angle
## Chinese Media Angle
Write the angle summary in English, with a suggested Chinese headline.
## The Edge-Style Angle
Analytical, business-depth framing.
## The Star-Style Angle
Mainstream business framing.
## Retail Investor Angle (9Shares-style)
Accessible, no hype, no trading calls.
## LinkedIn Thought Leadership Angle
## WhatsApp Investor Community Short Version
Under 100 words, factual, no trading language.
## CEO Quote Suggestions (3)
## Headline Options (5)
## Media Pitch Note
A short pitch email to a journalist.

Tone: professional, clear, practical, suitable for Malaysian corporate communication. Avoid AI-sounding filler.`,
    expectedOutputSchema:
      "Markdown: per-outlet angles, CEO quotes, headlines, media pitch note",
    modelPurpose: "final_writing",
    temperature: 0.6,
  },

  add_on_opportunity: {
    analysisType: "add_on_opportunity",
    promptName: "Add-On Opportunity Engine",
    promptCategory: "client_revenue",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Identify add-on IR/PR service opportunities Aegis can propose to client {{company_name}}.

Recent developments (results, announcements, price/volume moves, competitor actions, media exposure):
"""
{{recent_developments}}
"""

Services currently provided to this client: {{current_services}}

Score each opportunity 0-100 using these factors: latest result released, major announcement released, significant share price move, volume increase, competitor major update, outdated deck, low media exposure, low analyst coverage, strong story but poor visibility, approaching AGM/EGM/results, weak management profile, rising investor questions, negative news risk.

Available services and indicative fees:
- Quarterly Result PR: RM3,000–RM6,000
- Investor Deck Refresh: RM4,000–RM8,000
- Analyst Q&A Pack: RM2,000–RM4,000
- Media Interview / Feature: RM5,000–RM10,000
- Peer Benchmarking Report: RM3,000–RM6,000
- Monthly IR Intelligence Note: RM1,500–RM3,000
- Investor Visibility Growth Pack: RM8,000–RM15,000
- Crisis Monitoring Add-On: RM2,000–RM5,000 per month

For each opportunity (rank by score, max 5) produce:
### [Score]/100 — Opportunity Title
- **Why now:**
- **Recommended service:**
- **Proposed fee range:**
- **Supporting evidence:** (cite the developments above; flag anything unverified)
- **Urgency:** Low / Medium / High
- **Proposed message to client:** (2-3 sentences, professional, non-pushy)
- **Next action:**`,
    expectedOutputSchema:
      "Markdown: up to 5 scored opportunities with why-now, service, fee, evidence, urgency, client message, next action",
    modelPurpose: "long_analysis",
  },

  analyst_qna: {
    analysisType: "analyst_qna",
    promptName: "Analyst Q&A Builder",
    promptCategory: "client_content",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Build an analyst Q&A preparation pack for {{company_name}}.

Source material:
"""
{{source_text}}
"""

Produce a pack practical enough for direct CEO/CFO briefing:
## Likely Analyst Questions (10-12)
For each: suggested answer + likely follow-up question.
## Sensitive Questions
Questions that require careful handling, with suggested framing.
## Management Preparation Notes
## Data Required Before Finalising Answers
List every data point that must be confirmed with management before the briefing.
## Missing Information`,
    expectedOutputSchema:
      "Markdown: Q&A with follow-ups, sensitive questions, prep notes, data checklist",
    modelPurpose: "long_analysis",
  },

  client_monthly_value_report: {
    analysisType: "client_monthly_value_report",
    promptName: "Client Monthly Value Report",
    promptCategory: "client_report",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Draft the monthly value report for client {{company_name}} for {{month}}.

Completed deliverables this month:
"""
{{deliverables}}
"""

Market, announcement, media, and competitor context:
"""
{{market_summary}}
"""

Produce:
# {{company_name}} — Monthly IR/PR Value Report ({{month}})
## Completed Deliverables
## Key Announcements
## Share Price / Volume Movement
Only use figures given above; otherwise write "requires verification".
## Media Exposure
## Investor Activities
## Competitor Updates
## Key Market Developments
## Opportunities Identified
## Recommended Actions for Next Month
## Proposed Add-On Services

This report demonstrates Aegis' value and supports renewal — keep it factual, concrete, and client-ready.`,
    expectedOutputSchema:
      "Markdown monthly value report with deliverables, market context, opportunities, next-month actions",
    modelPurpose: "final_writing",
  },

  crisis_monitor: {
    analysisType: "crisis_monitor",
    promptName: "Crisis & Reputation Monitor",
    promptCategory: "client_risk",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Assess this potential crisis / reputation issue for {{company_name}}.

Issue description (media item, complaint, governance issue, market activity, etc.):
"""
{{issue_description}}
"""

Consider: negative media, social complaints, governance issues, auditor or board resignation, unusual market activity, financial red flags, related party transaction concerns, litigation, PN17/GN3 concerns, ESG controversy.

Produce:
## Risk Alert
Level: Low / Medium / High / Urgent.
## What Happened
## Why It Matters
## Who May Care (investors, media, regulators, customers, employees)
## Investor Concern
## Media Concern
## Recommended Response
## Draft Holding Statement
Short, factual, balanced — ready for management review. Mark every unverified fact "requires management confirmation".
## Escalation Recommendation`,
    expectedOutputSchema:
      "Markdown: risk alert level, situation analysis, stakeholder concerns, response, holding statement, escalation",
    modelPurpose: "long_analysis",
  },

  compliance_rewrite: {
    analysisType: "compliance_rewrite",
    promptName: "Compliance Checker & Rewrite",
    promptCategory: "client_compliance",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Review this client-facing draft for compliance and rewrite it.

Draft:
"""
{{draft_text}}
"""

Rule-based scan already flagged:
"""
{{flagged_issues}}
"""

Tasks:
1. Remove all Buy/Sell/Hold, target price, fair value, guaranteed return, "must go up" / "surely increase" language and trading calls.
2. Rewrite hype into balanced professional wording.
3. Flag any number that is not clearly supported by the draft's stated sources as "requires verification".
4. Highlight statements that need management confirmation.

Produce:
## Compliance Issues Found
## Rewritten Compliant Version
## Items Requiring Verification
## Items Requiring Management Confirmation`,
    expectedOutputSchema:
      "Markdown: issues list, rewritten draft, verification flags, confirmation flags",
    modelPurpose: "verifier",
    temperature: 0.2,
  },

  report_builder_client: {
    analysisType: "report_builder_client",
    promptName: "Client Report Builder",
    promptCategory: "client_report",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Generate a client-ready document.

Report type: {{report_type}}
Company: {{company_name}}

Context, analysis output, and source material to base the report on:
"""
{{context}}
"""

Requirements:
- Output clean Markdown ready to copy into a client deliverable.
- Follow the conventions of the report type exactly (a WhatsApp Investor Community Update must be under 120 words; a 1-page MarketPulse Note must fit one page; a Board and Management Summary must be executive-level bullets).
- No investment advice, no trading language, no target prices.
- Flag unsupported figures as "requires verification".
- End with a short "Prepared by Aegis Communication" sign-off line.`,
    expectedOutputSchema: "Markdown document matching the selected report type",
    modelPurpose: "final_writing",
  },

  // ──────────────────────────────────────────────────────────────
  // CLIENT IR/PR — PHASE 4A DELIVERABLE BUILDERS
  // ──────────────────────────────────────────────────────────────
  press_release_builder: {
    analysisType: "press_release_builder",
    promptName: "Press Release Builder",
    promptCategory: "client_deliverable",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Draft a client-ready press release package for {{company_name}}, a Bursa Malaysia-listed company.

Announcement / development type: {{announcement_type}}
Preferred strategic angle (if specified): {{strategic_angle}}
Quote direction (tone and emphasis for management quotes): {{quote_direction}}
Target media audience: {{target_media}}

Source material and notes:
"""
{{source_text}}
"""

Write in Malaysian listed-company style with The Edge / StarBiz discipline: facts first, strategy second, promotion last. Plain professional sentences, no generic hype, no banned phrases. Every figure must come from the source material or be marked "requires verification". Quotes must only contain claims supported by the sources — flag anything else "requires management confirmation".

Produce exactly these sections:
## Key Strategic Angle
## Communication Objective
## Headline Options (5)
## Press Release Draft
Full draft, ready for management review: headline, dateline (city, "Missing Information" if date unknown), lead paragraph with the hard facts, supporting paragraphs, boilerplate "About {{company_name}}" paragraph, and media contact placeholder.
## CEO Quote
## CFO Quote
Only if financially relevant — otherwise state "Not required for this announcement."
## Key Message Points
## Investor Takeaways
## Media Angle
How business media would frame this story.
## Items Requiring Management Confirmation
## Bursa Sensitivity Check
## Sources Used`,
    expectedOutputSchema:
      "Markdown: strategic angle, objective, 5 headlines, full press release draft, quotes, key messages, investor takeaways, media angle, confirmation items, sensitivity check, sources",
    modelPurpose: "final_writing",
  },

  media_interview_qna: {
    analysisType: "media_interview_qna",
    promptName: "Media Interview Q&A Builder",
    promptCategory: "client_deliverable",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Prepare a media interview Q&A briefing pack for {{company_name}}, a Bursa Malaysia-listed company.

Spokesperson: {{spokesperson}}
Interview context (occasion, recent events, expected topics): {{interview_context}}
Target outlet / journalist type: {{target_outlet}}

Source material and notes:
"""
{{source_text}}
"""

Answers must sound like a composed Malaysian listed-company {{spokesperson}}: factual, calm, no overpromising, no forward-looking guarantees, no price-sensitive disclosure beyond what is already public. Every answer must be supportable by the source material — mark unsupported content "requires verification" and anything needing internal sign-off "requires management confirmation".

Produce exactly these sections:
## Interview Positioning
The 2-3 core impressions the spokesperson should leave.
## Likely Media Questions (8-10)
Each with a spokesperson-safe suggested answer.
## Tough Questions (4-6)
Harder, sceptical questions with composed, factual answers.
## Analyst-Style Follow-Up Questions
Questions a financially literate journalist may push on, with safe answers.
## Sensitive Questions
Questions that touch unannounced, price-sensitive, or speculative ground.
## Holding Lines
Short, safe responses for questions the spokesperson should not answer in detail.
## Safer Wording Suggestions
Phrases to avoid in this interview and the safer alternative for each.
## Bursa Sensitivity Check
## Sources Used`,
    expectedOutputSchema:
      "Markdown: positioning, likely/tough/analyst/sensitive questions with answers, holding lines, safer wording, sensitivity check, sources",
    modelPurpose: "long_analysis",
  },

  activity_proposal_builder: {
    analysisType: "activity_proposal_builder",
    promptName: "Activity Proposal Builder",
    promptCategory: "client_deliverable",
    workspaceType: "client_ir_pr",
    systemPrompt: CLIENT_SYSTEM_PROMPT,
    userPromptTemplate: `Draft an IR/PR activity proposal that Aegis can present to client {{company_name}}, a Bursa Malaysia-listed company.

Activity type: {{activity_type}}
Objective: {{objective}}
Target audience: {{target_audience}}

Company context, recent developments, and notes:
"""
{{source_text}}
"""

The proposal must be concrete and client-ready: grounded in the company's actual situation from the source material, professional and non-pushy, with realistic deliverables. Mark assumptions "requires verification" and anything needing the client's internal decision "requires management confirmation".

Produce exactly these sections:
## Proposal Title
## Rationale
Why this activity, why now — anchored to the source material.
## Communication Objective
## Target Audience
## Proposed Activity Structure
Format, agenda outline, speakers/roles, and venue/platform considerations.
## Timeline
Preparation milestones working back from the proposed date ("Missing Information" if no date is given).
## Deliverables
What Aegis will produce and run.
## Expected Value to Client
Investor, media, and stakeholder outcomes — realistic, no guaranteed results.
## Suggested Fee Positioning
Only if the activity maps to a standard service; frame as a range and mark "requires management confirmation". Otherwise state "To be scoped with the client."
## Next Action
## Bursa Sensitivity Check
## Sources Used`,
    expectedOutputSchema:
      "Markdown: title, rationale, objective, audience, structure, timeline, deliverables, value, fee positioning, next action, sensitivity check, sources",
    modelPurpose: "final_writing",
  },

  // ──────────────────────────────────────────────────────────────
  // PRIVATE MARKET WORKSPACE
  // ──────────────────────────────────────────────────────────────
  gold_market_regime: {
    analysisType: "gold_market_regime",
    promptName: "Gold Market Regime",
    promptCategory: "private_analysis",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Classify the current gold market regime.

Market data (gold, DXY, US 2Y/10Y yields, VIX, indices — manually entered or computed):
"""
{{market_data}}
"""

Recent news and macro context:
"""
{{recent_news}}
"""

Classify into one of: Risk-off bullish gold, Dollar-driven pressure, Yield-driven pressure, Inflation hedge mode, Range-bound consolidation, Breakout watch, News-risk mode, Mixed / unclear.

Produce:
## Current Regime
## Confidence Level (Low / Medium / High)
## Supporting Factors
## Conflicting Signals
## What Confirms This Regime
## What Invalidates This Regime
## Trading Discipline Note
A direct reminder relevant to this regime (e.g. avoid chasing, wait for confirmation).`,
    expectedOutputSchema:
      "Markdown: regime, confidence, supporting/conflicting factors, confirmation/invalidation, discipline note",
    modelPurpose: "long_analysis",
  },

  gold_technical_structure: {
    analysisType: "gold_technical_structure",
    promptName: "Gold Technical Structure",
    promptCategory: "private_analysis",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Analyse the technical structure of gold (XAU/USD).

Price action data and notes (levels, OHLC, MAs, RSI/ATR if available, session behaviour, previous day high/low):
"""
{{price_action_notes}}
"""

Produce:
## Short-Term Trend
## Medium-Term Trend
## Support Zones
## Resistance Zones
## Volatility Assessment
## Structure (higher highs / lower lows, liquidity zones, breakout/fakeout risk)
## Session Notes (Asian / London / New York)
## Caution
## Scenarios
Never say "buy now" or "sell now" — use confirmation/invalidation language. If data for any section is missing, say "Missing Information".`,
    expectedOutputSchema:
      "Markdown: trends, S/R zones, volatility, structure, sessions, caution, scenarios",
    modelPurpose: "long_analysis",
  },

  macro_event_scenario: {
    analysisType: "macro_event_scenario",
    promptName: "Macro Event Scenario Planner",
    promptCategory: "private_analysis",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Build scenario plans for an upcoming macro event.

Event: {{event_name}}
Date/time: {{event_date}}
Consensus / expectation: {{consensus}}

Current market context:
"""
{{context}}
"""

Produce three scenarios — **Above expectations**, **Below expectations**, **In line** — each with:
- Possible DXY reaction
- Possible US yield reaction
- Possible gold reaction
- Possible index reaction
- Confirmation signal
- Invalidation signal
- What to watch
- Risk note (including fakeout risk for the in-line case)

End with:
## Overall Event Risk Level
## Discipline Reminder`,
    expectedOutputSchema:
      "Markdown: 3 scenarios with reactions, confirmation/invalidation, risk notes",
    modelPurpose: "long_analysis",
  },

  private_news_impact: {
    analysisType: "private_news_impact",
    promptName: "News Impact for Gold",
    promptCategory: "private_analysis",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Analyse this news for its impact on gold and related markets.

News headline / summary:
"""
{{news_text}}
"""

Classify as: bullish for gold, bearish for gold, mixed, risk event, or wait-and-see.

Produce:
## What Happened
## Classification
## Key Driver
## Impact on Gold
## Impact on DXY
## Impact on US Yields
## Impact on US Indices
## Risk Level
## What to Watch Next`,
    expectedOutputSchema:
      "Markdown: classification, driver, per-asset impact, risk level, watch list",
    modelPurpose: "fast_draft",
  },

  us_index_summary: {
    analysisType: "us_index_summary",
    promptName: "US Index Risk Summary",
    promptCategory: "private_analysis",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Summarise the US index and risk environment.

Index and risk data (S&P 500, Nasdaq, Dow, VIX, DXY, US 10Y, sector notes if available):
"""
{{market_data}}
"""

Produce:
## Risk-On / Risk-Off Summary
## Index Trend Summary
## Tech Sentiment
## Volatility Warning
## Impact to Gold
## Discipline Note`,
    expectedOutputSchema:
      "Markdown: risk-on/off, index trends, tech sentiment, volatility, gold impact",
    modelPurpose: "fast_draft",
  },

  trading_journal_review: {
    analysisType: "trading_journal_review",
    promptName: "Trading Journal Review",
    promptCategory: "private_coaching",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Review this trade from my journal.

Trade details:
"""
{{trade_details}}
"""

Market regime / context at the time (if recorded): {{market_context}}

Review honestly but constructively:
## Alignment Check
Was the trade aligned with the market regime?
## News Risk
Was there event risk that should have kept me out?
## Entry Quality
Was the entry chased after a big move?
## Plan Quality
Was the trade plan clear? Was the invalidation level clear?
## Emotional Review
What do the recorded emotions suggest?
## What to Improve
2-3 specific, actionable improvements.
## One-Line Lesson`,
    expectedOutputSchema:
      "Markdown: alignment, news risk, entry/plan quality, emotions, improvements, lesson",
    modelPurpose: "fast_draft",
  },

  risk_discipline_check: {
    analysisType: "risk_discipline_check",
    promptName: "Risk Discipline Coach",
    promptCategory: "private_coaching",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `I am considering a trade. Run my pre-trade risk discipline checklist.

My answers:
- Major news soon? {{news_soon}}
- Is gold aligned with DXY and yields? {{alignment}}
- Is the trend clear or mixed? {{trend_clarity}}
- Entering near support or resistance? {{near_level}}
- Am I chasing after a big move? {{chasing}}
- Do I have a clear invalidation level? {{invalidation}}
- Multiple losses already today? {{losses_today}}
- Aligned with my journal's best setup? {{best_setup}}

Additional context: {{context}}

Produce:
## News Risk
## Trend Clarity
## DXY / Yield Confirmation
## Volatility Risk
## Emotional Risk
## Overall Risk Level (Low / Medium / High / Do Not Trade)
## Discipline Warning
## Suggested Caution
Be direct. If the answers point to an impulsive trade, say so plainly. Never say "buy now" or "sell now".`,
    expectedOutputSchema:
      "Markdown: per-dimension risk assessment, overall risk level, discipline warning",
    modelPurpose: "fast_draft",
    temperature: 0.2,
  },

  weekly_trading_review: {
    analysisType: "weekly_trading_review",
    promptName: "Weekly Trading Performance Review",
    promptCategory: "private_coaching",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Review my trading week.

Trades this week (from my journal):
"""
{{trades_summary}}
"""

Produce:
## Week in Numbers
Number of trades, win rate if computable from the data (otherwise "Missing Information").
## Best Setup
## Worst Setup
## Recurring Mistakes
## Emotional Pattern
## Time-of-Day / Session Performance
## Lessons
## Next Week Focus
One primary focus and at most two secondary ones.`,
    expectedOutputSchema:
      "Markdown: stats, best/worst setups, mistakes, emotional pattern, lessons, next-week focus",
    modelPurpose: "long_analysis",
  },

  private_daily_market_note: {
    analysisType: "private_daily_market_note",
    promptName: "Private Daily Market Note",
    promptCategory: "private_report",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Write my private daily gold market note.

Market data (computed metrics and latest prices):
"""
{{market_data}}
"""

My notes and observations:
"""
{{notes}}
"""

Produce:
# Private Gold Daily Note
## Market Tone
## Gold
## DXY & Yields
## Equities & VIX
## Key Levels to Watch
## Upcoming Events
## Risk Warning
Keep it under 400 words. Practical, direct, no guarantees.`,
    expectedOutputSchema: "Markdown daily note under 400 words",
    modelPurpose: "fast_draft",
  },

  report_builder_private: {
    analysisType: "report_builder_private",
    promptName: "Private Report Builder",
    promptCategory: "private_report",
    workspaceType: "private_market",
    systemPrompt: PRIVATE_SYSTEM_PROMPT,
    userPromptTemplate: `Generate a private market report.

Report type: {{report_type}}

Context, data, and notes to base the report on:
"""
{{context}}
"""

Output clean Markdown matching the report type. No guaranteed outcomes, no "buy now"/"sell now" language, always include a risk note.`,
    expectedOutputSchema: "Markdown report matching the selected type",
    modelPurpose: "final_writing",
  },
};

export function getTemplate(analysisType: AnalysisType): PromptTemplate {
  const template = PROMPT_TEMPLATES[analysisType];
  if (!template) {
    throw new Error(`Unknown analysis type: ${analysisType}`);
  }
  return template;
}
