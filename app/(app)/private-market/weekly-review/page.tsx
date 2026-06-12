import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";
import type { TradingJournalEntry } from "@/types/database";

export const dynamic = "force-dynamic";

function entryToLine(e: TradingJournalEntry): string {
  return [
    `${e.trade_date.slice(0, 16).replace("T", " ")} | ${e.asset_symbol} ${e.direction}`,
    `entry ${e.entry_price ?? "—"} → exit ${e.exit_price ?? "—"} | result: ${e.result ?? "—"}`,
    `entry reason: ${e.reason_for_entry ?? "—"}`,
    `emotion: ${e.emotion_before ?? "—"} → ${e.emotion_after ?? "—"} | lesson: ${e.lesson ?? "—"}`,
  ].join("\n");
}

export default async function WeeklyReviewPage() {
  let prefill = "";
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("trading_journal")
        .select("*")
        .gte("trade_date", weekAgo)
        .order("trade_date", { ascending: true });
      const entries = (data ?? []) as TradingJournalEntry[];
      prefill = entries.map(entryToLine).join("\n\n");
    } catch {
      prefill = "";
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Weekly Performance Review"
        description="Pre-filled with the last 7 days of journal entries — edit before running if needed."
        badge="private only"
        badgeVariant="ai"
      />
      <AnalysisRunner
        module={MODULES.weekly_trading_review}
        initialValues={{ trades_summary: prefill }}
      />
    </div>
  );
}
