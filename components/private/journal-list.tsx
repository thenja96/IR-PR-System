"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/shared/markdown";
import { formatDate, formatNumber } from "@/lib/utils";
import type { TradingJournalEntry } from "@/types/database";

function tradeToText(entry: TradingJournalEntry): string {
  return [
    `Date: ${entry.trade_date}`,
    `Asset: ${entry.asset_symbol} | Direction: ${entry.direction}`,
    `Entry: ${entry.entry_price ?? "—"} | Exit: ${entry.exit_price ?? "—"} | Size: ${entry.position_size ?? "—"}`,
    `Reason for entry: ${entry.reason_for_entry ?? "—"}`,
    `Reason for exit: ${entry.reason_for_exit ?? "—"}`,
    `Emotion before: ${entry.emotion_before ?? "—"} | Emotion after: ${entry.emotion_after ?? "—"}`,
    `Result: ${entry.result ?? "—"}`,
    `Lesson noted: ${entry.lesson ?? "—"}`,
  ].join("\n");
}

export function JournalList({ entries }: { entries: TradingJournalEntry[] }) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleReview(entry: TradingJournalEntry) {
    setReviewing(entry.id);
    setErrors((p) => ({ ...p, [entry.id]: "" }));
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: "trading_journal_review",
          inputs: { trade_details: tradeToText(entry), market_context: "" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Review failed.");

      const supabase = createClient();
      const { error } = await supabase
        .from("trading_journal")
        .update({ ai_review: data.markdown })
        .eq("id", entry.id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [entry.id]: err instanceof Error ? err.message : "Review failed.",
      }));
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                {entry.asset_symbol}
                <Badge variant={entry.direction === "long" ? "success" : "danger"}>
                  {entry.direction}
                </Badge>
                <span className="text-xs font-normal text-muted-foreground">
                  {formatDate(entry.trade_date)}
                </span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReview(entry)}
                disabled={reviewing === entry.id}
              >
                {reviewing === entry.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                )}
                {entry.ai_review ? "Re-run AI review" : "AI review"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Entry</p>
                <p className="font-medium">{entry.entry_price !== null ? formatNumber(entry.entry_price) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exit</p>
                <p className="font-medium">{entry.exit_price !== null ? formatNumber(entry.exit_price) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="font-medium">{entry.position_size ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Result</p>
                <p className="font-medium">{entry.result ?? "—"}</p>
              </div>
            </div>
            {entry.reason_for_entry && (
              <p>
                <span className="text-xs text-muted-foreground">Entry reason: </span>
                {entry.reason_for_entry}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              {entry.emotion_before && (
                <Badge variant="info">before: {entry.emotion_before}</Badge>
              )}
              {entry.emotion_after && (
                <Badge variant="warning">after: {entry.emotion_after}</Badge>
              )}
              {entry.lesson && <Badge variant="success">lesson: {entry.lesson}</Badge>}
            </div>
            {errors[entry.id] && (
              <p className="text-sm text-red-600">{errors[entry.id]}</p>
            )}
            {entry.ai_review && (
              <div className="rounded-md border border-purple-200 bg-purple-50/50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-purple-700">
                  <Sparkles className="h-3.5 w-3.5" /> AI Review
                </p>
                <Markdown content={entry.ai_review} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
