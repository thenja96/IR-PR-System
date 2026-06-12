import { BookOpen } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { JournalForm } from "@/components/private/journal-form";
import { JournalList } from "@/components/private/journal-list";
import type { TradingJournalEntry } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function TradingJournalPage() {
  let entries: TradingJournalEntry[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("trading_journal")
        .select("*")
        .order("trade_date", { ascending: false })
        .limit(50);
      entries = (data ?? []) as TradingJournalEntry[];
    } catch {
      entries = [];
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Trading Journal"
        description="Record every trade with reasons and emotions. The AI review checks regime alignment, chasing, plan clarity, and invalidation discipline."
        badge="private only"
        badgeVariant="ai"
      />
      <div className="mb-6">
        <JournalForm />
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No journal entries"
          description="Log your first trade — the Weekly Review and Risk Coach work best with an honest journal."
        />
      ) : (
        <JournalList entries={entries} />
      )}
    </div>
  );
}
