export interface QuarterFinancials {
  period: string;
  revenue: number;
  grossProfit?: number;
  operatingProfit?: number;
  netProfit: number;
  totalEquity?: number;
  totalDebt?: number;
  cash?: number;
}

export interface CompanyFinancialSummary {
  revenueYoY: number | null;
  revenueQoQ: number | null;
  netProfitYoY: number | null;
  netProfitQoQ: number | null;
  netMargin: number | null;
  netGearing: number | null;
  roe: number | null;
}
