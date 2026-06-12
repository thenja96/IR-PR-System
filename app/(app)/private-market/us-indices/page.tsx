import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";
import { formatNumber } from "@/lib/utils";
import { LineChart } from "lucide-react";

export const dynamic = "force-dynamic";

const SYMBOLS = [
  { symbol: "SPX", label: "S&P 500" },
  { symbol: "NDX", label: "Nasdaq 100" },
  { symbol: "DJI", label: "Dow Jones" },
  { symbol: "VIX", label: "VIX" },
];

async function getLatest(symbol: string) {
  if (!isSupabaseConfigured()) return { close: null as number | null, change: null as number | null };
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("market_prices")
      .select("close, price_date")
      .eq("asset_symbol", symbol)
      .order("price_date", { ascending: false })
      .limit(2);
    if (!data || data.length === 0) return { close: null, change: null };
    const close = Number(data[0].close);
    const change =
      data.length > 1
        ? ((close - Number(data[1].close)) / Number(data[1].close)) * 100
        : null;
    return { close, change };
  } catch {
    return { close: null, change: null };
  }
}

export default async function UsIndicesPage() {
  const latest = await Promise.all(SYMBOLS.map((s) => getLatest(s.symbol)));

  const summary = SYMBOLS.map(
    (s, i) =>
      `${s.label}: ${formatNumber(latest[i].close)} (1d: ${formatNumber(latest[i].change)}%)`
  ).join("\n");

  return (
    <div>
      <PageHeader
        title="US Index Dashboard"
        description="Risk-on / risk-off context for gold — S&P 500, Nasdaq, Dow, VIX."
        badge="private only"
        badgeVariant="ai"
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SYMBOLS.map((s, i) => (
          <StatCard
            key={s.symbol}
            title={s.label}
            value={formatNumber(latest[i].close)}
            hint={`1d ${formatNumber(latest[i].change)}%`}
            icon={LineChart}
            tone={(latest[i].change ?? 0) >= 0 ? "success" : "danger"}
          />
        ))}
      </div>
      <div className="max-w-4xl">
        <AnalysisRunner
          module={MODULES.us_index_summary}
          initialValues={{ market_data: summary }}
        />
      </div>
    </div>
  );
}
