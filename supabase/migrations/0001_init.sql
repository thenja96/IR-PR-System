-- ============================================================
-- Aegis MarketPulse AI — initial schema
-- Run in the Supabase SQL editor or via `supabase db push`.
-- ============================================================

create extension if not exists vector;

-- ──────────────────────────────────────────────────────────
-- 1. users_profile
-- ──────────────────────────────────────────────────────────
create table if not exists public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'analyst'
    check (role in ('admin', 'analyst', 'writer', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 2. workspaces
-- ──────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_name text not null,
  workspace_type text not null
    check (workspace_type in ('client_ir_pr', 'private_market')),
  visibility text not null default 'team'
    check (visibility in ('team', 'private_only')),
  owner_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 3. companies
-- ──────────────────────────────────────────────────────────
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_name text not null,
  stock_code text,
  bursa_market text,
  sector text,
  business_description text,
  client_status text default 'prospect',
  assigned_pic text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 4. company_peers
-- ──────────────────────────────────────────────────────────
create table if not exists public.company_peers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  peer_company_name text not null,
  peer_stock_code text,
  peer_sector text,
  reason_for_comparison text,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 5. source_documents
-- ──────────────────────────────────────────────────────────
create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  document_type text not null default 'other'
    check (document_type in (
      'annual_report','quarterly_report','investor_deck','bursa_announcement',
      'press_release','media_article','price_volume_csv','macro_note',
      'trading_note','other')),
  document_title text not null,
  file_url text,
  file_name text,
  file_size bigint,
  extracted_text text,
  source_date date,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 6. document_chunks (pgvector, OpenAI text-embedding-3-small dims)
-- ──────────────────────────────────────────────────────────
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  chunk_text text not null,
  chunk_index int not null default 0,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ──────────────────────────────────────────────────────────
-- 7. market_prices
-- ──────────────────────────────────────────────────────────
create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_symbol text not null,
  asset_name text,
  asset_type text not null
    check (asset_type in (
      'malaysia_stock','gold','us_index','forex','bond_yield',
      'volatility_index','commodity','macro')),
  price_date date not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric not null,
  volume numeric,
  created_at timestamptz not null default now(),
  unique (workspace_id, asset_symbol, price_date)
);

create index if not exists market_prices_symbol_date_idx
  on public.market_prices (asset_symbol, price_date);

-- ──────────────────────────────────────────────────────────
-- 8. market_metrics
-- ──────────────────────────────────────────────────────────
create table if not exists public.market_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_symbol text not null,
  metric_date date not null,
  return_1d numeric,
  return_1w numeric,
  return_1m numeric,
  return_3m numeric,
  return_6m numeric,
  return_ytd numeric,
  avg_daily_volume_30d numeric,
  volume_spike_ratio numeric,
  drawdown numeric,
  volatility numeric,
  moving_average_20 numeric,
  moving_average_50 numeric,
  moving_average_200 numeric,
  created_at timestamptz not null default now(),
  unique (workspace_id, asset_symbol, metric_date)
);

-- ──────────────────────────────────────────────────────────
-- 9. ai_analysis_runs
-- ──────────────────────────────────────────────────────────
create table if not exists public.ai_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  analysis_type text not null,
  model_used text,
  input_summary text,
  output_json jsonb,
  output_markdown text,
  status text not null default 'completed'
    check (status in ('completed', 'failed', 'running')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists ai_analysis_runs_company_idx
  on public.ai_analysis_runs (company_id, created_at desc);

-- ──────────────────────────────────────────────────────────
-- 10. client_opportunities
-- ──────────────────────────────────────────────────────────
create table if not exists public.client_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  opportunity_title text not null,
  opportunity_type text not null
    check (opportunity_type in (
      'press_release','investor_deck_refresh','analyst_briefing','media_interview',
      'board_management_summary','peer_benchmarking','whatsapp_investor_update',
      'crisis_monitoring','monthly_ir_report','result_ir_pack','esg_pr_angle',
      'investor_visibility_campaign')),
  opportunity_score numeric check (opportunity_score >= 0 and opportunity_score <= 100),
  why_now text,
  suggested_service text,
  proposed_fee_range text,
  supporting_evidence text,
  status text not null default 'open'
    check (status in ('open', 'proposed', 'won', 'lost', 'dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 11. alerts
-- ──────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  alert_type text not null,
  alert_title text not null,
  alert_level text not null default 'medium'
    check (alert_level in ('low', 'medium', 'high', 'urgent')),
  alert_summary text,
  suggested_action text,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 12. trading_journal
-- ──────────────────────────────────────────────────────────
create table if not exists public.trading_journal (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  trade_date timestamptz not null default now(),
  asset_symbol text not null,
  direction text not null check (direction in ('long', 'short')),
  entry_price numeric,
  exit_price numeric,
  position_size text,
  reason_for_entry text,
  reason_for_exit text,
  emotion_before text,
  emotion_after text,
  result text,
  lesson text,
  screenshot_url text,
  ai_review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 13. prompt_templates
-- ──────────────────────────────────────────────────────────
create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  prompt_name text not null,
  prompt_category text not null,
  workspace_type text not null
    check (workspace_type in ('client_ir_pr', 'private_market')),
  system_prompt text not null,
  user_prompt_template text not null,
  default_model text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────
-- 14. model_settings
-- ──────────────────────────────────────────────────────────
create table if not exists public.model_settings (
  id uuid primary key default gen_random_uuid(),
  setting_name text not null,
  model_slug text not null,
  provider text,
  purpose text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions (security definer to avoid RLS recursion)
-- ============================================================
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users_profile where id = auth.uid();
$$;

-- Workspace access:
--  * private_only workspaces: OWNER ONLY (admin does NOT override —
--    the privacy rule is stronger than the admin rule).
--  * team workspaces: any authenticated user; admin always.
create or replace function public.has_workspace_access(ws uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = ws
      and (
        w.owner_id = auth.uid()
        or (
          w.visibility = 'team'
          and auth.uid() is not null
        )
      )
  );
$$;

-- Roles allowed to create/edit content (viewer is read-only).
create or replace function public.can_edit_content()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() in ('admin', 'analyst', 'writer'), false);
$$;

-- ============================================================
-- updated_at maintenance
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users_profile','workspaces','companies','source_documents',
    'client_opportunities','alerts','trading_journal',
    'prompt_templates','model_settings'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================
-- Auto-create profile on signup (first user becomes admin)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
begin
  select count(*) into existing_count from public.users_profile;
  insert into public.users_profile (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when existing_count = 0 then 'admin' else 'analyst' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up BEFORE this migration ran.
-- The earliest user becomes admin if no admin exists yet.
insert into public.users_profile (id, full_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email),
  case
    when u.created_at = (select min(created_at) from auth.users)
         and not exists (select 1 from public.users_profile where role = 'admin')
    then 'admin'
    else 'analyst'
  end
from auth.users u
where not exists (select 1 from public.users_profile p where p.id = u.id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users_profile enable row level security;
alter table public.workspaces enable row level security;
alter table public.companies enable row level security;
alter table public.company_peers enable row level security;
alter table public.source_documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.market_prices enable row level security;
alter table public.market_metrics enable row level security;
alter table public.ai_analysis_runs enable row level security;
alter table public.client_opportunities enable row level security;
alter table public.alerts enable row level security;
alter table public.trading_journal enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.model_settings enable row level security;

-- users_profile: everyone signed in can see team profiles; users update
-- their own profile; admins manage all.
create policy "profiles_select" on public.users_profile
  for select using (auth.uid() is not null);
create policy "profiles_update_own" on public.users_profile
  for update using (id = auth.uid() or public.current_user_role() = 'admin');

-- workspaces
create policy "workspaces_select" on public.workspaces
  for select using (
    owner_id = auth.uid()
    or (visibility = 'team' and auth.uid() is not null)
  );
create policy "workspaces_insert" on public.workspaces
  for insert with check (auth.uid() is not null and owner_id = auth.uid());
create policy "workspaces_update" on public.workspaces
  for update using (
    owner_id = auth.uid()
    or (visibility = 'team' and public.current_user_role() = 'admin')
  );
create policy "workspaces_delete" on public.workspaces
  for delete using (owner_id = auth.uid());

-- Generic workspace-scoped content policies
do $$
declare t text;
begin
  foreach t in array array[
    'companies','source_documents','document_chunks','market_prices',
    'market_metrics','client_opportunities','alerts','trading_journal'
  ] loop
    execute format(
      'create policy "%1$s_select" on public.%1$I
         for select using (public.has_workspace_access(workspace_id));
       create policy "%1$s_insert" on public.%1$I
         for insert with check (public.has_workspace_access(workspace_id) and public.can_edit_content());
       create policy "%1$s_update" on public.%1$I
         for update using (public.has_workspace_access(workspace_id) and public.can_edit_content());
       create policy "%1$s_delete" on public.%1$I
         for delete using (public.has_workspace_access(workspace_id) and public.current_user_role() in (''admin'', ''analyst''));',
      t);
  end loop;
end $$;

-- company_peers: scoped through the parent company's workspace
create policy "company_peers_select" on public.company_peers
  for select using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and public.has_workspace_access(c.workspace_id)
    )
  );
create policy "company_peers_insert" on public.company_peers
  for insert with check (
    public.can_edit_content()
    and exists (
      select 1 from public.companies c
      where c.id = company_id and public.has_workspace_access(c.workspace_id)
    )
  );
create policy "company_peers_delete" on public.company_peers
  for delete using (
    public.can_edit_content()
    and exists (
      select 1 from public.companies c
      where c.id = company_id and public.has_workspace_access(c.workspace_id)
    )
  );

-- ai_analysis_runs: workspace-scoped, with a fallback for runs that could
-- not be attached to a workspace (workspace_id null → only the creator).
create policy "ai_runs_select" on public.ai_analysis_runs
  for select using (
    (workspace_id is not null and public.has_workspace_access(workspace_id))
    or (workspace_id is null and created_by = auth.uid())
  );
create policy "ai_runs_insert" on public.ai_analysis_runs
  for insert with check (
    created_by = auth.uid()
    and (
      workspace_id is null
      or public.has_workspace_access(workspace_id)
    )
  );

-- prompt_templates / model_settings: read for all signed-in, write admin only
create policy "prompt_templates_select" on public.prompt_templates
  for select using (auth.uid() is not null);
create policy "prompt_templates_admin_write" on public.prompt_templates
  for all using (public.current_user_role() = 'admin');
create policy "model_settings_select" on public.model_settings
  for select using (auth.uid() is not null);
create policy "model_settings_admin_write" on public.model_settings
  for all using (public.current_user_role() = 'admin');

-- ============================================================
-- Storage: "sources" bucket for uploaded documents
-- Wrapped in exception handlers: on some Supabase projects the SQL
-- editor role cannot create policies on storage.objects. That must
-- NOT abort the schema migration — if it is skipped, create the
-- bucket + policies manually in Dashboard → Storage.
-- ============================================================
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('sources', 'sources', false)
  on conflict (id) do nothing;
exception when others then
  raise notice 'Could not create storage bucket (%). Create a private bucket named "sources" in Dashboard → Storage.', sqlerrm;
end $$;

do $$
begin
  create policy "sources_upload" on storage.objects
    for insert with check (bucket_id = 'sources' and auth.uid() is not null);
  create policy "sources_read" on storage.objects
    for select using (bucket_id = 'sources' and auth.uid() is not null);
  create policy "sources_delete" on storage.objects
    for delete using (bucket_id = 'sources' and auth.uid() is not null);
exception when others then
  raise notice 'Could not create storage policies (%). Add them in Dashboard → Storage → sources → Policies (allow authenticated insert/select/delete).', sqlerrm;
end $$;
