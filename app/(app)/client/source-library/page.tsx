import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  SourceIntelligenceTabs,
  type SourceListRow,
} from "@/components/client/source-intelligence-tabs";

export const dynamic = "force-dynamic";

const BASE_COLUMNS =
  "id, document_title, document_type, file_name, source_date, created_at, extracted_text, companies(company_name)";
const INTEL_COLUMNS =
  ", source_url, source_domain, source_trust_tier, retrieval_status";

export default async function SourceLibraryPage() {
  let sources: SourceListRow[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const primary = await supabase
        .from("source_documents")
        .select(BASE_COLUMNS + INTEL_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(100);
      let rows: unknown = primary.data;
      if (primary.error) {
        // Migration 0002 not applied yet — fall back to the original columns
        // so the existing library keeps working.
        const fallback = await supabase
          .from("source_documents")
          .select(BASE_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(100);
        rows = fallback.data;
      }
      sources = ((rows ?? []) as SourceListRow[]);
    } catch {
      sources = [];
    }
  }

  return (
    <div>
      <PageHeader
        title="Source Intelligence Centre"
        description="Official disclosures, company communications, media coverage, and internal notes — pasted manually or imported from a URL. AI analysis cites these sources by title and trust tier."
      />
      <SourceIntelligenceTabs sources={sources} />
    </div>
  );
}
