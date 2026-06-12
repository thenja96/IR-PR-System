import { PageHeader } from "@/components/shared/page-header";
import { ComplianceTool } from "@/components/client/compliance-tool";

export default function ComplianceCheckerPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Compliance Checker"
        description="Every client-facing output must pass this check — no Buy/Sell/Hold, target prices, guarantees, or unsupported claims."
        badge="compliance"
        badgeVariant="warning"
      />
      <ComplianceTool />
    </div>
  );
}
