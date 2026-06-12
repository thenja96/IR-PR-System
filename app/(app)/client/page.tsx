import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Bell,
  Sparkles,
  Radar,
  Swords,
  Presentation,
  Eye,
  Activity,
  Lightbulb,
  Upload,
  FileText,
  ArrowRight,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Alert, ClientOpportunity } from "@/types/database";

export const dynamic = "force-dynamic";

async function getData() {
  const empty = {
    companyCount: 0,
    opportunities: [] as ClientOpportunity[],
    alerts: [] as Alert[],
    runCount: 0,
  };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createClient();
    const [companies, opps, alerts, runs] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase
        .from("client_opportunities")
        .select("*")
        .eq("status", "open")
        .order("opportunity_score", { ascending: false })
        .limit(5),
      supabase
        .from("alerts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("ai_analysis_runs")
        .select("id", { count: "exact", head: true }),
    ]);
    return {
      companyCount: companies.count ?? 0,
      opportunities: (opps.data ?? []) as ClientOpportunity[],
      alerts: (alerts.data ?? []) as Alert[],
      runCount: runs.count ?? 0,
    };
  } catch {
    return empty;
  }
}

const quickActions = [
  { label: "Run IR Angle", href: "/client/ir-angle-lab", icon: Lightbulb },
  { label: "Run Add-On Engine", href: "/client/add-on-opportunities", icon: TrendingUp },
  { label: "Add Source", href: "/client/source-library", icon: Upload },
  { label: "Generate Report", href: "/client/report-builder", icon: FileText },
];

const watchCards = [
  {
    title: "Clients Needing Deck Update",
    description: "Surface these via the Add-On Engine with deck age in the developments.",
    href: "/client/add-on-opportunities",
    icon: Presentation,
  },
  {
    title: "Low Media Visibility",
    description: "Compare visibility through Competitor Intelligence.",
    href: "/client/competitor-intelligence",
    icon: Eye,
  },
  {
    title: "Price / Volume Movement",
    description: "Paste recent moves into the News Impact Radar.",
    href: "/client/news-impact",
    icon: Activity,
  },
  {
    title: "Competitor Actions",
    description: "Maintain peer lists per company and run comparisons.",
    href: "/client/competitor-intelligence",
    icon: Swords,
  },
];

const alertLevelVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  low: "info",
  medium: "warning",
  high: "danger",
  urgent: "danger",
};

const statusVariant: Record<string, "info" | "success" | "warning"> = {
  open: "info",
  proposed: "warning",
  won: "success",
};

export default async function ClientDashboardPage() {
  const data = await getData();
  const highImpact = data.alerts.filter(
    (a) => a.alert_level === "high" || a.alert_level === "urgent"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Dashboard"
        description="Observations, investor concerns, and communication opportunities — no investment advice is generated in this workspace."
        badge="team workspace"
        actions={
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <Button size="sm" variant="outline">
                    <Icon className="h-3.5 w-3.5 text-teal-600" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title="Total clients" value={data.companyCount} icon={Building2} />
        <StatCard
          title="Active opportunities"
          value={data.opportunities.length}
          icon={TrendingUp}
          tone="success"
          hint="Open pipeline below"
        />
        <StatCard
          title="High impact alerts"
          value={highImpact}
          icon={Bell}
          tone={highImpact > 0 ? "danger" : "default"}
        />
        <StatCard title="AI analysis runs" value={data.runCount} icon={Sparkles} tone="ai" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue pipeline */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Opportunities This Week
              </CardTitle>
              <Link href="/client/add-on-opportunities">
                <Button variant="ghost" size="sm" className="text-primary">
                  Pipeline <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Highest-scoring open add-on opportunities across all clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.opportunities.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No open opportunities.{" "}
                <Link
                  href="/client/add-on-opportunities"
                  className="text-primary underline underline-offset-2"
                >
                  Run the Add-On Opportunity Engine
                </Link>{" "}
                to fill the pipeline.
              </div>
            ) : (
              data.opportunities.map((opp) => {
                const score = Math.round(opp.opportunity_score ?? 0);
                return (
                  <div
                    key={opp.id}
                    className="rounded-lg border p-3.5 transition-colors hover:border-teal-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-medium leading-snug">
                        {opp.opportunity_title}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={statusVariant[opp.status] ?? "info"}>
                          {opp.status}
                        </Badge>
                        <span className="text-sm font-semibold tabular-nums text-teal-700">
                          {score}
                        </span>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                        style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {opp.suggested_service ?? "Service TBD"}
                      </span>
                      <span>{opp.proposed_fee_range ?? "fee TBD"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-red-200/70 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50">
                <Bell className="h-3.5 w-3.5 text-red-600" />
              </span>
              High Impact Alerts
            </CardTitle>
            <CardDescription>Open alerts across all clients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open alerts. Crisis Monitor and News Impact Radar findings
                appear here.
              </p>
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border-l-2 border-l-red-400 bg-muted/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium leading-snug">
                      {alert.alert_title}
                    </p>
                    <Badge
                      variant={alertLevelVariant[alert.alert_level] ?? "info"}
                      className="shrink-0"
                    >
                      {alert.alert_level}
                    </Badge>
                  </div>
                  {alert.suggested_action && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      → {alert.suggested_action}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    {alert.alert_type.replace(/_/g, " ")} ·{" "}
                    {formatDate(alert.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Watch cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {watchCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <Card className="h-full transition-colors group-hover:border-teal-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-[13px]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </span>
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Announcement radar shortcut */}
      <Card className="bg-gradient-to-r from-accent/60 to-transparent">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100">
              <Radar className="h-[18px] w-[18px] text-teal-700" />
            </span>
            <div>
              <p className="text-sm font-medium">Latest Bursa Announcement?</p>
              <p className="text-xs text-muted-foreground">
                Paste it into the Announcement Radar for classification,
                investor questions, and a suggested IR/PR response.
              </p>
            </div>
          </div>
          <Link href="/client/announcement-radar">
            <Button size="sm">
              Open Radar <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
