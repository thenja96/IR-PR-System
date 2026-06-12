import Link from "next/link";
import {
  Coins,
  Gauge,
  TrendingUp,
  LineChart,
  Brain,
  HeartPulse,
  ArrowRight,
  Info,
  Lock,
  Percent,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeMetrics } from "@/lib/calculations/market";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriceChart } from "@/components/charts/price-chart";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";
import { formatNumber } from "@/lib/utils";
import type { OhlcvPoint } from "@/types/market";

export const dynamic = "force-dynamic";

async function getSeries(symbol: string): Promise<OhlcvPoint[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("market_prices")
      .select("price_date, open, high, low, close, volume")
      .eq("asset_symbol", symbol)
      .order("price_date", { ascending: true })
      .limit(250);
    return (data ?? []).map((row) => ({
      date: row.price_date as string,
      open: row.open,
      high: row.high,
      low: row.low,
      close: Number(row.close),
      volume: row.volume,
    }));
  } catch {
    return [];
  }
}

export default async function GoldDashboardPage() {
  const [gold, dxy, us10y, vix, ndx] = await Promise.all([
    getSeries("XAUUSD"),
    getSeries("DXY"),
    getSeries("US10Y"),
    getSeries("VIX"),
    getSeries("NDX"),
  ]);

  const goldMetrics = computeMetrics(gold);
  const latest = (s: OhlcvPoint[]) => s[s.length - 1]?.close ?? null;
  const change1d = (s: OhlcvPoint[]) => {
    if (s.length < 2) return null;
    const prev = s[s.length - 2].close;
    return ((s[s.length - 1].close - prev) / prev) * 100;
  };

  const vixLevel = latest(vix) ?? 0;
  const vixTone = vixLevel >= 25 ? "danger" : vixLevel >= 18 ? "warning" : "success";

  // Computed-in-code metrics handed to the AI as factual context.
  const marketDataSummary = [
    `Gold (XAU/USD): ${formatNumber(latest(gold))} (1d: ${formatNumber(change1d(gold))}%, 1w: ${formatNumber(goldMetrics.return1w)}%, 1m: ${formatNumber(goldMetrics.return1m)}%)`,
    `Gold MA20: ${formatNumber(goldMetrics.ma20)}, MA50: ${formatNumber(goldMetrics.ma50)}, annualised volatility: ${formatNumber(goldMetrics.volatility)}%`,
    `DXY: ${formatNumber(latest(dxy))} (1d: ${formatNumber(change1d(dxy))}%)`,
    `US 10Y yield: ${formatNumber(latest(us10y))} (1d change: ${formatNumber(change1d(us10y))}%)`,
    `VIX: ${formatNumber(latest(vix))}`,
    `Nasdaq 100: ${formatNumber(latest(ndx))} (1d: ${formatNumber(change1d(ndx))}%)`,
  ].join("\n");

  return (
    <div className="space-y-6">
      {/* Trading command centre header */}
      <section className="relative overflow-hidden rounded-xl border border-navy-border bg-navy px-5 py-5 text-white sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(500px 200px at 80% -30%, rgba(168,85,247,0.25), transparent), radial-gradient(400px 180px at 10% 130%, rgba(20,184,166,0.18), transparent)",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-purple-300">
              <Lock className="h-3 w-3" /> Private Trading Command Centre
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Gold Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Gold, dollar, yields, volatility, and equities — never mixed
              with client reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/private-market/market-regime">
              <Button size="sm" variant="secondary" className="border border-white/10 bg-white/10 text-slate-100 hover:bg-white/20">
                <Brain className="h-3.5 w-3.5 text-purple-300" /> Market Regime
              </Button>
            </Link>
            <Link href="/private-market/risk-coach">
              <Button size="sm" variant="secondary" className="border border-white/10 bg-white/10 text-slate-100 hover:bg-white/20">
                <HeartPulse className="h-3.5 w-3.5 text-amber-300" /> Risk Coach
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* MVP data note */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          <span className="font-medium">Manual data for MVP:</span> prices come
          from the <code>market_prices</code> table (currently demo seed data).
          Update them via SQL or CSV import — real-time feeds arrive in a later
          phase. All metrics below are computed in code; AI only interprets
          them.
        </p>
      </div>

      {/* Top market cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="XAU/USD"
          value={formatNumber(latest(gold))}
          delta={change1d(gold)}
          hint={`1m ${formatNumber(goldMetrics.return1m)}% · vol ${formatNumber(goldMetrics.volatility)}%`}
          icon={Coins}
          tone={(change1d(gold) ?? 0) >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="DXY"
          value={formatNumber(latest(dxy))}
          delta={change1d(dxy)}
          hint="Dollar pressure gauge"
          icon={TrendingUp}
        />
        <StatCard
          title="US 10Y Yield"
          value={formatNumber(latest(us10y))}
          delta={change1d(us10y)}
          hint="Opportunity cost driver"
          icon={Percent}
        />
        <StatCard
          title="VIX"
          value={formatNumber(latest(vix))}
          hint={vixLevel >= 25 ? "Elevated risk" : vixLevel >= 18 ? "Watch zone" : "Calm"}
          icon={Gauge}
          tone={vixTone}
        />
        <StatCard
          title="Nasdaq 100"
          value={formatNumber(latest(ndx))}
          delta={change1d(ndx)}
          hint="Risk appetite proxy"
          icon={LineChart}
          tone={(change1d(ndx) ?? 0) >= 0 ? "success" : "danger"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">XAU/USD</CardTitle>
            <CardDescription className="tabular-nums">
              MA20 {formatNumber(goldMetrics.ma20)} · MA50 {formatNumber(goldMetrics.ma50)} · drawdown {formatNumber(goldMetrics.drawdown)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceChart
              data={gold.map((p) => ({ date: p.date, close: p.close }))}
              name="XAU/USD"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">DXY</CardTitle>
            <CardDescription>Dollar strength vs gold pressure</CardDescription>
          </CardHeader>
          <CardContent>
            <PriceChart
              data={dxy.map((p) => ({ date: p.date, close: p.close }))}
              color="#6366f1"
              name="DXY"
            />
          </CardContent>
        </Card>
      </div>

      {/* Highlight modules */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/private-market/market-regime" className="group">
          <Card className="relative h-full overflow-hidden transition-colors group-hover:border-purple-300">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                  <Brain className="h-[18px] w-[18px] text-purple-600" />
                </span>
                AI Market Regime
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Classify today's regime — risk-off bullish, dollar-driven,
                yield-driven, range-bound — with confirmation and invalidation
                signals before you trade.
              </p>
              <ArrowRight className="h-4 w-4 shrink-0 text-purple-500 transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/private-market/risk-coach" className="group">
          <Card className="relative h-full overflow-hidden transition-colors group-hover:border-amber-300">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                  <HeartPulse className="h-[18px] w-[18px] text-amber-600" />
                </span>
                Risk Discipline Coach
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                The 8-question pre-trade checklist. Blunt about chasing,
                missing invalidation levels, and revenge trading.
              </p>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Daily note runner */}
      <div className="max-w-4xl">
        <AnalysisRunner
          module={MODULES.private_daily_market_note}
          initialValues={{ market_data: marketDataSummary }}
        />
      </div>
    </div>
  );
}
