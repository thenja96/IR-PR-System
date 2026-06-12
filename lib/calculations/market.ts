// Market data calculations. All numbers are computed in code —
// AI only interprets these results, it never invents them.

import type { OhlcvPoint, ComputedMetrics } from "@/types/market";

/** Simple percentage return between two prices, in percent. */
export function calculateReturn(
  startPrice: number,
  endPrice: number
): number | null {
  if (!startPrice || startPrice === 0) return null;
  return ((endPrice - startPrice) / startPrice) * 100;
}

/** YTD return given a series sorted ascending by date. */
export function calculateYTDReturn(series: OhlcvPoint[]): number | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const year = new Date(last.date).getFullYear();
  const firstOfYear = series.find(
    (p) => new Date(p.date).getFullYear() === year
  );
  if (!firstOfYear || firstOfYear === last) return null;
  return calculateReturn(firstOfYear.close, last.close);
}

export function calculateAverageDailyVolume(
  series: OhlcvPoint[],
  days = 30
): number | null {
  const withVolume = series
    .slice(-days)
    .map((p) => p.volume)
    .filter((v): v is number => v !== null && v !== undefined);
  if (withVolume.length === 0) return null;
  return withVolume.reduce((a, b) => a + b, 0) / withVolume.length;
}

/** Latest volume vs 30-day average. >1 means above average. */
export function calculateVolumeSpike(series: OhlcvPoint[]): number | null {
  const avg = calculateAverageDailyVolume(series.slice(0, -1), 30);
  const last = series[series.length - 1]?.volume;
  if (!avg || last === null || last === undefined) return null;
  return last / avg;
}

/** Max drawdown over the series, in percent (negative number). */
export function calculateDrawdown(series: OhlcvPoint[]): number | null {
  if (series.length < 2) return null;
  let peak = series[0].close;
  let maxDrawdown = 0;
  for (const p of series) {
    if (p.close > peak) peak = p.close;
    const dd = ((p.close - peak) / peak) * 100;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }
  return maxDrawdown;
}

/** Annualised volatility of daily returns, in percent. */
export function calculateVolatility(series: OhlcvPoint[]): number | null {
  if (series.length < 3) return null;
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].close;
    if (prev) returns.push((series[i].close - prev) / prev);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function calculateMovingAverage(
  series: OhlcvPoint[],
  window: number
): number | null {
  if (series.length < window) return null;
  const slice = series.slice(-window);
  return slice.reduce((a, p) => a + p.close, 0) / window;
}

/** Compute the full metric set for a sorted-ascending OHLCV series. */
export function computeMetrics(series: OhlcvPoint[]): ComputedMetrics {
  const n = series.length;
  const last = series[n - 1];
  const at = (back: number) => (n > back ? series[n - 1 - back] : undefined);

  return {
    return1d: at(1) ? calculateReturn(at(1)!.close, last.close) : null,
    return1w: at(5) ? calculateReturn(at(5)!.close, last.close) : null,
    return1m: at(21) ? calculateReturn(at(21)!.close, last.close) : null,
    returnYtd: calculateYTDReturn(series),
    avgDailyVolume30d: calculateAverageDailyVolume(series, 30),
    volumeSpikeRatio: calculateVolumeSpike(series),
    drawdown: calculateDrawdown(series),
    volatility: calculateVolatility(series),
    ma20: calculateMovingAverage(series, 20),
    ma50: calculateMovingAverage(series, 50),
    ma200: calculateMovingAverage(series, 200),
  };
}
