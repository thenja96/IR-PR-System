// Company financial calculations — computed in code, interpreted by AI.

/** Year-on-year growth, in percent. */
export function calculateYoYGrowth(
  current: number,
  yearAgo: number
): number | null {
  if (!yearAgo || yearAgo === 0) return null;
  return ((current - yearAgo) / Math.abs(yearAgo)) * 100;
}

/** Quarter-on-quarter growth, in percent. */
export function calculateQoQGrowth(
  current: number,
  previousQuarter: number
): number | null {
  if (!previousQuarter || previousQuarter === 0) return null;
  return ((current - previousQuarter) / Math.abs(previousQuarter)) * 100;
}

/** Margin (e.g. net profit / revenue), in percent. */
export function calculateMargin(
  profit: number,
  revenue: number
): number | null {
  if (!revenue || revenue === 0) return null;
  return (profit / revenue) * 100;
}

/** Net gearing = (total debt − cash) / total equity, in percent. */
export function calculateNetGearing(
  totalDebt: number,
  cash: number,
  totalEquity: number
): number | null {
  if (!totalEquity || totalEquity === 0) return null;
  return ((totalDebt - cash) / totalEquity) * 100;
}

/** Return on equity, in percent. */
export function calculateROE(
  netProfit: number,
  totalEquity: number
): number | null {
  if (!totalEquity || totalEquity === 0) return null;
  return (netProfit / totalEquity) * 100;
}

/** A segment's revenue contribution, in percent. */
export function calculateRevenueContribution(
  segmentRevenue: number,
  totalRevenue: number
): number | null {
  if (!totalRevenue || totalRevenue === 0) return null;
  return (segmentRevenue / totalRevenue) * 100;
}
