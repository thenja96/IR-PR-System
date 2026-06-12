-- ──────────────────────────────────────────────────────────
-- 0002: Source Intelligence Phase 1
-- Adds URL-import metadata and trust-tier classification to
-- source_documents. Purely additive: existing rows and the
-- manual-paste flow keep working unchanged.
-- ──────────────────────────────────────────────────────────

alter table public.source_documents
  add column if not exists source_url text,
  add column if not exists source_domain text,
  add column if not exists source_trust_tier text,
  add column if not exists retrieval_status text,
  add column if not exists retrieved_at timestamptz,
  add column if not exists source_author text,
  add column if not exists source_publication text,
  add column if not exists source_language text,
  add column if not exists source_citation jsonb;

-- Allowed values. NULL stays allowed so pre-existing rows are never invalid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'source_documents_trust_tier_check'
  ) then
    alter table public.source_documents
      add constraint source_documents_trust_tier_check
      check (
        source_trust_tier is null
        or source_trust_tier in ('tier_1', 'tier_2', 'tier_3', 'tier_4')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'source_documents_retrieval_status_check'
  ) then
    alter table public.source_documents
      add constraint source_documents_retrieval_status_check
      check (
        retrieval_status is null
        or retrieval_status in ('manual', 'fetched', 'fetch_failed', 'pdf_link_only')
      );
  end if;
end $$;

-- Backfill existing rows (all were manual paste / file upload before Phase 1).
update public.source_documents
set retrieval_status = 'manual'
where retrieval_status is null;

-- Derive a starting trust tier from the document type for existing rows.
update public.source_documents
set source_trust_tier = case document_type
  when 'bursa_announcement' then 'tier_1'
  when 'annual_report'      then 'tier_1'
  when 'quarterly_report'   then 'tier_1'
  when 'press_release'      then 'tier_1'
  when 'investor_deck'      then 'tier_2'
  when 'media_article'      then 'tier_3'
  when 'price_volume_csv'   then 'tier_3'
  else 'tier_4'
end
where source_trust_tier is null;

create index if not exists idx_source_documents_trust_tier
  on public.source_documents (source_trust_tier);
