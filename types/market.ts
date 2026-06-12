export interface OhlcvPoint {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  volume?: number | null;
}

export interface ComputedMetrics {
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  returnYtd: number | null;
  avgDailyVolume30d: number | null;
  volumeSpikeRatio: number | null;
  drawdown: number | null;
  volatility: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
}
