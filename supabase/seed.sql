-- ============================================================
-- Aegis MarketPulse AI — sample seed data
-- Run AFTER 0001_init.sql and AFTER signing up your first user
-- (the first signup becomes admin and owns the seeded workspaces).
-- Safe to re-run: skips if workspaces already exist.
-- ============================================================

do $$
declare
  v_user uuid;
  v_client_ws uuid;
  v_private_ws uuid;
  v_company uuid;
  d date;
  i int := 0;
begin
  -- Attach everything to the first registered user.
  select id into v_user from auth.users order by created_at limit 1;
  if v_user is null then
    raise exception 'No users found. Sign up in the app first, then run this seed.';
  end if;

  if exists (select 1 from public.workspaces) then
    raise notice 'Workspaces already exist — skipping seed.';
    return;
  end if;

  -- ── Workspaces ─────────────────────────────────────────
  insert into public.workspaces (workspace_name, workspace_type, visibility, owner_id)
  values ('Aegis Client IR/PR Workspace', 'client_ir_pr', 'team', v_user)
  returning id into v_client_ws;

  insert into public.workspaces (workspace_name, workspace_type, visibility, owner_id)
  values ('Private Gold Market Workspace', 'private_market', 'private_only', v_user)
  returning id into v_private_ws;

  -- ── Example company: Chin Hin Group Berhad (5273) ──────
  insert into public.companies (
    workspace_id, company_name, stock_code, bursa_market, sector,
    business_description, client_status, assigned_pic, website, notes
  ) values (
    v_client_ws, 'Chin Hin Group Berhad', '5273', 'Main Market', 'Building Materials',
    'Integrated building materials and construction group: AAC blocks, precast concrete, wire mesh, ready-mixed concrete, and property-related ventures across Malaysia.',
    'active_client', 'Aegis IR Team', 'https://www.chinhingroup.com',
    'Quarterly results usually released late in the reporting window. Deck last refreshed two quarters ago.'
  ) returning id into v_company;

  insert into public.company_peers (company_id, peer_company_name, peer_stock_code, peer_sector, reason_for_comparison) values
    (v_company, 'Cahya Mata Sarawak', '2852', 'Building Materials', 'Diversified building materials peer with cement exposure'),
    (v_company, 'Hume Cement Industries', '5000', 'Building Materials', 'Cement and concrete products competitor'),
    (v_company, 'Ajiya Berhad', '7609', 'Building Materials', 'Metal and glass building products peer');

  -- ── Sample source documents ────────────────────────────
  insert into public.source_documents (
    workspace_id, company_id, document_type, document_title,
    extracted_text, source_date, uploaded_by
  ) values (
    v_client_ws, v_company, 'quarterly_report',
    'Chin Hin Group — Sample Quarterly Result Summary (placeholder)',
    'PLACEHOLDER SAMPLE — replace with real data. Revenue for the quarter rose year-on-year driven by higher AAC block volume. Net profit margin narrowed on input cost pressure. Net gearing remains moderate. Order visibility for precast segment extends into next financial year. (All figures require verification against the actual published report.)',
    current_date - 30, v_user
  );

  insert into public.source_documents (
    workspace_id, document_type, document_title, extracted_text, source_date, uploaded_by
  ) values (
    v_private_ws, 'macro_note',
    'Gold market note — example',
    'Example private note: Gold consolidating below recent highs. DXY firm ahead of CPI. US 10Y holding range. Watch CPI release this week; breakout requires confirmation. Avoid chasing intraday spikes.',
    current_date - 2, v_user
  );

  -- ── Sample opportunity + alert (client dashboard demo) ─
  insert into public.client_opportunities (
    workspace_id, company_id, opportunity_title, opportunity_type,
    opportunity_score, why_now, suggested_service, proposed_fee_range,
    supporting_evidence, status
  ) values (
    v_client_ws, v_company,
    'Quarterly Result IR Pack — upcoming results window', 'result_ir_pack',
    78, 'Results due within 4 weeks; last quarter drew margin questions from analysts.',
    'Quarterly Result PR + Analyst Q&A Pack', 'RM3,000–RM6,000',
    'Sample seed record — replace after first Add-On Engine run.', 'open'
  );

  insert into public.alerts (
    workspace_id, company_id, alert_type, alert_title, alert_level,
    alert_summary, suggested_action, status
  ) values (
    v_client_ws, v_company, 'result_season', 'Result season approaching for Chin Hin',
    'medium', 'Quarterly results window opens soon; investor questions on margins expected.',
    'Prepare Analyst Q&A pack and draft result press release angle.', 'open'
  );

  -- ── Sample trading journal entry ───────────────────────
  insert into public.trading_journal (
    workspace_id, trade_date, asset_symbol, direction, entry_price, exit_price,
    position_size, reason_for_entry, reason_for_exit, emotion_before,
    emotion_after, result, lesson
  ) values (
    v_private_ws, now() - interval '2 days', 'XAUUSD', 'long', 3340.00, 3352.50,
    '0.5 lot', 'Bounce from tested support with DXY softening after data miss.',
    'Took profit at prior session high.', 'Calm', 'Confident',
    '+12.5 points', 'Patience at support paid off; entry was not chased.'
  );

  -- ── Prompt template registry ───────────────────────────
  -- Canonical prompt text lives in code (lib/prompts/templates.ts).
  -- These rows register the library for future DB-driven editing.
  insert into public.prompt_templates (prompt_name, prompt_category, workspace_type, system_prompt, user_prompt_template, default_model) values
    ('Company Snapshot', 'client_analysis', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: lib/prompts/templates.ts → company_snapshot', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Financial Highlights', 'client_analysis', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: financial_highlights', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Bursa Announcement Analysis', 'client_analysis', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: bursa_announcement', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Competitor Intelligence', 'client_analysis', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: competitor_intelligence', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('News Impact Radar', 'client_analysis', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: news_impact', 'env:DEFAULT_FAST_DRAFT_MODEL'),
    ('Investor Concern Detector', 'client_analysis', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: investor_concern', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('IR Angle Generator', 'client_content', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: ir_angle', 'env:DEFAULT_FINAL_WRITING_MODEL'),
    ('PR Angle Generator', 'client_content', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: pr_angle', 'env:DEFAULT_FINAL_WRITING_MODEL'),
    ('Add-On Opportunity Engine', 'client_revenue', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: add_on_opportunity', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Analyst Q&A Builder', 'client_content', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: analyst_qna', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Client Monthly Value Report', 'client_report', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: client_monthly_value_report', 'env:DEFAULT_FINAL_WRITING_MODEL'),
    ('Crisis Monitor', 'client_risk', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: crisis_monitor', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Compliance Checker', 'client_compliance', 'client_ir_pr', 'STANDARD_CLIENT_SYSTEM_PROMPT', 'Managed in code: compliance_rewrite', 'env:DEFAULT_VERIFIER_MODEL'),
    ('Gold Market Regime', 'private_analysis', 'private_market', 'STANDARD_PRIVATE_SYSTEM_PROMPT', 'Managed in code: gold_market_regime', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Gold Technical Structure', 'private_analysis', 'private_market', 'STANDARD_PRIVATE_SYSTEM_PROMPT', 'Managed in code: gold_technical_structure', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('Macro Event Scenario', 'private_analysis', 'private_market', 'STANDARD_PRIVATE_SYSTEM_PROMPT', 'Managed in code: macro_event_scenario', 'env:DEFAULT_LONG_ANALYSIS_MODEL'),
    ('News Impact for Gold', 'private_analysis', 'private_market', 'STANDARD_PRIVATE_SYSTEM_PROMPT', 'Managed in code: private_news_impact', 'env:DEFAULT_FAST_DRAFT_MODEL'),
    ('Trading Journal Review', 'private_coaching', 'private_market', 'STANDARD_PRIVATE_SYSTEM_PROMPT', 'Managed in code: trading_journal_review', 'env:DEFAULT_FAST_DRAFT_MODEL'),
    ('Risk Discipline Coach', 'private_coaching', 'private_market', 'STANDARD_PRIVATE_SYSTEM_PROMPT', 'Managed in code: risk_discipline_check', 'env:DEFAULT_FAST_DRAFT_MODEL'),
    ('Weekly Trading Review', 'private_coaching', 'private_market', 'STANDARD_PRIVATE_SYSTEM_PROMPT', 'Managed in code: weekly_trading_review', 'env:DEFAULT_LONG_ANALYSIS_MODEL');

  -- ── Model routing registry ─────────────────────────────
  insert into public.model_settings (setting_name, model_slug, provider, purpose) values
    ('Long analysis', 'anthropic/claude-sonnet-4-6', 'Anthropic via OpenRouter', 'long_analysis'),
    ('Fast drafting', 'qwen/qwen-2.5-72b-instruct', 'Qwen via OpenRouter', 'fast_draft'),
    ('Final writing', 'anthropic/claude-sonnet-4-6', 'Anthropic via OpenRouter', 'final_writing'),
    ('Verifier / compliance', 'openai/gpt-4o-mini', 'OpenAI via OpenRouter', 'verifier');

  -- ── Sample market prices (60 days, deterministic walk) ─
  -- Demo data only — replace with real prices via CSV import.
  for d in select generate_series(current_date - 59, current_date, interval '1 day')::date loop
    i := i + 1;
    -- Gold
    insert into public.market_prices (workspace_id, asset_symbol, asset_name, asset_type, price_date, open, high, low, close)
    values (v_private_ws, 'XAUUSD', 'Gold Spot', 'gold', d,
      3300 + 45 * sin(i / 9.0) + 18 * sin(i / 3.7),
      3300 + 45 * sin(i / 9.0) + 18 * sin(i / 3.7) + 12,
      3300 + 45 * sin(i / 9.0) + 18 * sin(i / 3.7) - 12,
      3300 + 45 * sin(i / 9.0) + 20 * sin(i / 3.5));
    -- DXY
    insert into public.market_prices (workspace_id, asset_symbol, asset_name, asset_type, price_date, close)
    values (v_private_ws, 'DXY', 'US Dollar Index', 'forex', d,
      103.5 + 1.4 * sin(i / 11.0) - 0.6 * sin(i / 4.2));
    -- US 10Y
    insert into public.market_prices (workspace_id, asset_symbol, asset_name, asset_type, price_date, close)
    values (v_private_ws, 'US10Y', 'US 10Y Treasury Yield', 'bond_yield', d,
      4.25 + 0.18 * sin(i / 8.0));
    -- VIX
    insert into public.market_prices (workspace_id, asset_symbol, asset_name, asset_type, price_date, close)
    values (v_private_ws, 'VIX', 'CBOE Volatility Index', 'volatility_index', d,
      16 + 4 * abs(sin(i / 7.0)));
    -- US indices
    insert into public.market_prices (workspace_id, asset_symbol, asset_name, asset_type, price_date, close)
    values
      (v_private_ws, 'SPX', 'S&P 500', 'us_index', d, 5900 + 120 * sin(i / 13.0) + i * 1.5),
      (v_private_ws, 'NDX', 'Nasdaq 100', 'us_index', d, 21000 + 500 * sin(i / 12.0) + i * 6),
      (v_private_ws, 'DJI', 'Dow Jones', 'us_index', d, 43000 + 600 * sin(i / 14.0) + i * 4);
  end loop;

  raise notice 'Seed complete. Client workspace: %, Private workspace: %', v_client_ws, v_private_ws;
end $$;
