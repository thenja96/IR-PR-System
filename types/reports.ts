export const CLIENT_REPORT_TYPES = [
  "1-page MarketPulse Note",
  "Quarterly Result IR Pack",
  "Press Release Angle Proposal",
  "Analyst Q&A Pack",
  "Board and Management Summary",
  "Competitor Intelligence Report",
  "News Impact Memo",
  "Client Monthly Value Report",
  "Crisis Response Note",
  "WhatsApp Investor Community Update",
] as const;

export const PRIVATE_REPORT_TYPES = [
  "Private Gold Daily Note",
  "Weekly Gold Market Review",
  "Macro Event Scenario Note",
  "Trading Journal Review",
  "Risk Discipline Summary",
] as const;

export type ClientReportType = (typeof CLIENT_REPORT_TYPES)[number];
export type PrivateReportType = (typeof PRIVATE_REPORT_TYPES)[number];
