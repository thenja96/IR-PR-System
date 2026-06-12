import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function MarketRegimePage() {
  const m = MODULES.gold_market_regime;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={m.title}
        description="Risk-off bullish, dollar-driven, yield-driven, inflation hedge, range-bound, breakout watch, news-risk, or mixed — with confirmation and invalidation signals."
        badge="private only"
        badgeVariant="ai"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
