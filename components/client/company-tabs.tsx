"use client";

import Link from "next/link";
import { Library, LineChart, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Markdown } from "@/components/shared/markdown";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { PeerForm } from "@/components/client/peer-form";
import { MODULES } from "@/lib/ai/modules";
import { formatDate } from "@/lib/utils";
import type {
  AiAnalysisRun,
  Company,
  CompanyPeer,
  ClientOpportunity,
  SourceDocument,
} from "@/types/database";

export function CompanyTabs({
  company,
  peers,
  sources,
  runs,
  opportunities,
}: {
  company: Company;
  peers: CompanyPeer[];
  sources: SourceDocument[];
  runs: AiAnalysisRun[];
  opportunities: ClientOpportunity[];
}) {
  const prefill = { company_name: company.company_name };
  const peerSummary = peers
    .map(
      (p) =>
        `${p.peer_company_name}${p.peer_stock_code ? ` (${p.peer_stock_code})` : ""} — ${p.reason_for_comparison ?? "peer"}`
    )
    .join("\n");

  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="sources">Sources</TabsTrigger>
        <TabsTrigger value="announcements">Announcements</TabsTrigger>
        <TabsTrigger value="peers">Peers</TabsTrigger>
        <TabsTrigger value="concerns">Investor Concerns</TabsTrigger>
        <TabsTrigger value="angles">IR/PR Angles</TabsTrigger>
        <TabsTrigger value="opportunities">Add-On Opportunities</TabsTrigger>
        <TabsTrigger value="insights">AI Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Business overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{company.business_description || "No description added yet."}</p>
              {company.notes && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                  <p className="mt-1">{company.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                {[
                  ["Stock code", company.stock_code],
                  ["Market", company.bursa_market],
                  ["Sector", company.sector],
                  ["Status", company.client_status?.replace(/_/g, " ")],
                  ["PIC", company.assigned_pic],
                  ["Website", company.website],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="sources">
        {sources.length === 0 ? (
          <EmptyState
            icon={Library}
            title="No source documents"
            description="Upload annual reports, quarterly results, decks, or paste announcement text in the Source Library."
            action={
              <Link href="/client/source-library">
                <Button size="sm">Open Source Library</Button>
              </Link>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source date</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_title}</TableCell>
                      <TableCell>
                        <Badge variant="info">{doc.document_type.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(doc.source_date)}</TableCell>
                      <TableCell>{formatDate(doc.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="announcements">
        <AnalysisRunner
          module={MODULES.bursa_announcement}
          companyId={company.id}
          initialValues={prefill}
        />
      </TabsContent>

      <TabsContent value="peers">
        <div className="space-y-4">
          <PeerForm companyId={company.id} />
          {peers.length === 0 ? (
            <EmptyState
              title="No peers yet"
              description="Add peer companies to enable competitor intelligence comparisons."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peer</TableHead>
                      <TableHead>Stock code</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Reason for comparison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {peers.map((peer) => (
                      <TableRow key={peer.id}>
                        <TableCell className="font-medium">{peer.peer_company_name}</TableCell>
                        <TableCell>{peer.peer_stock_code ?? "—"}</TableCell>
                        <TableCell>{peer.peer_sector ?? "—"}</TableCell>
                        <TableCell>{peer.reason_for_comparison ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <AnalysisRunner
            module={MODULES.competitor_intelligence}
            companyId={company.id}
            initialValues={{
              company_name: company.company_name,
              client_context: company.business_description ?? "",
              peer_updates: peerSummary,
            }}
          />
        </div>
      </TabsContent>

      <TabsContent value="concerns">
        <AnalysisRunner
          module={MODULES.investor_concern}
          companyId={company.id}
          initialValues={prefill}
        />
      </TabsContent>

      <TabsContent value="angles">
        <div className="space-y-6">
          <AnalysisRunner
            module={MODULES.ir_angle}
            companyId={company.id}
            initialValues={prefill}
          />
          <AnalysisRunner
            module={MODULES.pr_angle}
            companyId={company.id}
            initialValues={prefill}
          />
        </div>
      </TabsContent>

      <TabsContent value="opportunities">
        <div className="space-y-4">
          {opportunities.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {opportunities.map((opp) => {
                const score = Math.round(opp.opportunity_score ?? 0);
                return (
                  <Card key={opp.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm leading-snug">
                          {opp.opportunity_title}
                        </CardTitle>
                        <span className="shrink-0 rounded-md bg-teal-50 px-2 py-1 text-sm font-semibold tabular-nums text-teal-700">
                          {score}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                          style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                        />
                      </div>
                      {opp.why_now && (
                        <p className="text-xs text-muted-foreground">
                          {opp.why_now}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="info">{opp.status}</Badge>
                        {opp.suggested_service && (
                          <span className="font-medium">{opp.suggested_service}</span>
                        )}
                        {opp.proposed_fee_range && (
                          <span className="text-muted-foreground">
                            {opp.proposed_fee_range}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <AnalysisRunner
            module={MODULES.add_on_opportunity}
            companyId={company.id}
            initialValues={prefill}
          />
        </div>
      </TabsContent>

      <TabsContent value="insights">
        {runs.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No AI insights yet"
            description="Analysis you run for this company appears here with its full output."
          />
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <Card key={run.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-b bg-gradient-to-r from-purple-50/70 to-transparent px-4 py-2.5">
                  <Badge variant="ai">{run.analysis_type.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {run.model_used}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(run.created_at)}
                  </span>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <Markdown content={run.output_markdown ?? ""} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
