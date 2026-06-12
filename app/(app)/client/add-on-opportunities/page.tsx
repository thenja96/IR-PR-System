import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClientOpportunity } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AddOnOpportunitiesPage() {
  const m = MODULES.add_on_opportunity;

  let saved: (ClientOpportunity & { companies: { company_name: string } | null })[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("client_opportunities")
        .select("*, companies(company_name)")
        .order("opportunity_score", { ascending: false })
        .limit(20);
      saved = (data ?? []) as typeof saved;
    } catch {
      saved = [];
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={m.title}
        description={m.description}
        badge="revenue engine"
        badgeVariant="success"
      />

      {saved.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Opportunity pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Fee range</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saved.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell>{opp.companies?.company_name ?? "—"}</TableCell>
                    <TableCell className="font-medium">{opp.opportunity_title}</TableCell>
                    <TableCell>
                      <Badge variant="success">{Math.round(opp.opportunity_score ?? 0)}</Badge>
                    </TableCell>
                    <TableCell>{opp.suggested_service ?? "—"}</TableCell>
                    <TableCell>{opp.proposed_fee_range ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="info">{opp.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AnalysisRunner module={m} />
    </div>
  );
}
