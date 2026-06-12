-- ──────────────────────────────────────────────────────────
-- 0003: Official Source Extraction (Phase 3B)
-- Extends retrieval_status with extraction outcomes, and adds
-- a usefulness classification used by the Source Picker and the
-- AI source context. Additive and safe to re-run.
-- ──────────────────────────────────────────────────────────

alter table public.source_documents
  add column if not exists source_usefulness text;

do $$
begin
  -- Replace the retrieval_status constraint with the extended value set.
  if exists (
    select 1 from pg_constraint
    where conname = 'source_documents_retrieval_status_check'
  ) then
    alter table public.source_documents
      drop constraint source_documents_retrieval_status_check;
  end if;

  alter table public.source_documents
    add constraint source_documents_retrieval_status_check
    check (
      retrieval_status is null
      or retrieval_status in (
        'manual',                    -- pasted text / file upload
        'fetched',                   -- HTML fetched and text extracted (Phase 1)
        'fetch_failed',              -- URL could not be fetched; metadata saved
        'pdf_link_only',             -- legacy Phase 1/3A PDF link-only saves
        'text_extracted',            -- PDF/HTML text extracted server-side (Phase 3B)
        'link_only',                 -- saved without text; manual paste needed
        'extraction_failed',         -- fetched but text extraction errored
        'manual_with_official_url'   -- official URL saved + text pasted manually
      )
    );

  if not exists (
    select 1 from pg_constraint
    where conname = 'source_documents_usefulness_check'
  ) then
    alter table public.source_documents
      add constraint source_documents_usefulness_check
      check (
        source_usefulness is null
        or source_usefulness in (
          'high_usefulness', 'medium_usefulness', 'context_only', 'low_usefulness'
        )
      );
  end if;
end $$;

-- Backfill usefulness for existing rows from the document type.
update public.source_documents
set source_usefulness = case document_type
  when 'annual_report'      then 'high_usefulness'
  when 'quarterly_report'   then 'high_usefulness'
  when 'bursa_announcement' then 'high_usefulness'
  when 'investor_deck'      then 'medium_usefulness'
  when 'press_release'      then 'medium_usefulness'
  when 'media_article'      then 'context_only'
  when 'price_volume_csv'   then 'context_only'
  else 'low_usefulness'
end
where source_usefulness is null;
