import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TRACKED_EVENTS = [
  "CPI", "PPI", "PCE", "NFP", "Unemployment rate", "FOMC decision",
  "Fed Chair speech", "ISM", "Retail sales", "US GDP", "Treasury auction",
  "Geopolitical risk", "Central bank gold buying",
];

export default function MacroWatchPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Macro Watch"
        description="Manually log upcoming macro events and generate gold/DXY/yield impact plans. Economic calendar API integration is a later phase."
        badge="private only"
        badgeVariant="ai"
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Events tracked</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {TRACKED_EVENTS.map((e) => (
            <span
              key={e}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {e}
            </span>
          ))}
        </CardContent>
      </Card>
      <AnalysisRunner module={MODULES.macro_event_scenario} />
    </div>
  );
}
