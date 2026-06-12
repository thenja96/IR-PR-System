import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Bell,
  Sparkles,
  ArrowRight,
  Coins,
  Briefcase,
  AlertTriangle,
  Lightbulb,
  FileText,
  ShieldCheck,
  Plus,
  Brain,
  Lock,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Alert, ClientOpportunity } from "@/types/database";

export const dynamic = "force-dynamic";

async function getStats() {
  const empty = {
    companies: 0,
    opportunityCount: 0,
    alertCount: 0,
    opportunities: [] as ClientOpportunity[],
    alerts: [] as Alert[],
    runs: [] as Array<{
      id: string;
      analysis_type: string;
      created_at: string;
      model_used: string | null;
    }>,
  };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createClient();
    const [companies, oppCount, alertCount, opps, alerts, runs] =
      await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase
          .from("client_opportunities")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase
          .from("client_opportunities")
          .select("*")
          .eq("status", "open")
          .order("opportunity_score", { ascending: false })
          .limit(4),
        supabase
          .from("alerts")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("ai_analysis_runs")
          .select("id, analysis_type, created_at, model_used")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
    return {
      companies: companies.count ?? 0,
      opportunityCount: oppCount.count ?? 0,
      alertCount: alertCount.count ?? 0,
      opportunities: (opps.data ?? []) as ClientOpportunity[],
      alerts: (alerts.data ?? []) as Alert[],
      runs: runs.data ?? [],
    };
  } catch {
    return empty;
  }
}

const quickActions = [
  { label: "Run IR Angle", href: "/client/ir-angle-lab", icon: Lightbulb },
  { label: "Add-On Engine", href: "/client/add-on-opportunities", icon: TrendingUp },
  { label: "Add Company", href: "/client/companies", icon: Plus },
  { label: "Report Builder", href: "/client/report-builder", icon: FileText },
  { label: "Compliance Check", href: "/client/compliance-checker", icon: ShieldCheck },
];

const alertLevelVariant: Record<string, "info" | "warning" | "danger"> = {
  low: "info",
  medium: "warning",
  high: "danger",
  urgent: "danger",
};

export default async function DashboardPage() {
  const stats = await getStats();
  const configured = isSupabaseConfigured();
  const today = new Date().toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Hero / command centre header */}
      <section className="relative overflow-hidden rounded-xl border border-navy-border bg-navy px-5 py-6 text-white sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px 220px at 85% -20%, rgba(20,184,166,0.25), transparent), radial-gradient(400px 180px at 15% 120%, rgba(99,102,241,0.15), transparent)",
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-teal-400">
            Command Centre · {today}
          </p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
            Aegis MarketPulse AI
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Market intelligence, investor narrative, and IR/PR opportunity —
            turned into revenue-generating client actions.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href + action.label} href={action.href}>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border border-white/10 bg-white/10 text-slate-100 hover:bg-white/20"
                  >
                    <Icon className="h-3.5 w-3.5 text-teal-300" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {!configured && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Supabase is not configured yet. Copy <code>.env.example</code> to{" "}
              <code>.env.local</code>, add your keys, then run the migration in{" "}
              <code>supabase/migrations</code>. See the README.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title="Companies tracked" value={stats.companies} icon={Building2} />
        <StatCard
          title="Open opportunities"
          value={stats.opportunityCount}
          icon={TrendingUp}
          tone="success"
          hint="Add-on revenue pipeline"
        />
        <StatCard
          title="Open alerts"
          value={stats.alertCount}
          icon={Bell}
          tone={stats.alertCount > 0 ? "warning" : "default"}
        />
        <StatCard
          title="AI runs (recent)"
          value={stats.runs.length}
          icon={Sparkles}
          tone="ai"
        />
      </div>

      {/* Workspace cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="group relative flex flex-col overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                  <Briefcase className="h-5 w-5 text-teal-600" />
                </span>
                <CardTitle className="text-base">
                  Client IR/PR Workspace
                </CardTitle>
              </div>
              <Badge variant="info">team</Badge>
            </div>
            <CardDescription className="pt-1">
              Bursa announcements, investor concerns, IR/PR angles, competitor
              intelligence, and scored add-on opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {stats.companies} companies · {stats.opportunityCount} open
              opportunities
            </p>
            <Link href="/client">
              <Button size="sm">
                Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group relative flex flex-col overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <Coins className="h-5 w-5 text-purple-600" />
                </span>
                <CardTitle className="text-base">
                  Private Market Workspace
                </CardTitle>
              </div>
              <Badge variant="ai" className="gap-1">
                <Lock className="h-2.5 w-2.5" /> private only
              </Badge>
            </div>
            <CardDescription className="pt-1">
              Gold, US indices, DXY, yields, macro scenarios, trading journal,
              and risk discipline. Strictly separated from client output.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Brain className="h-3.5 w-3.5 text-purple-500" /> AI regime ·
              technicals · discipline coach
            </p>
            <Link href="/private-market/gold">
              <Button size="sm" variant="outline">
                Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities + Alerts + Runs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              Top Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stats.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open opportunities yet —{" "}
                <Link
                  href="/client/add-on-opportunities"
                  className="text-primary underline underline-offset-2"
                >
                  run the Add-On Engine
                </Link>
                .
              </p>
            ) : (
              stats.opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="rounded-lg border bg-card p-3 transition-colors hover:border-teal-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium leading-snug">
                      {opp.opportunity_title}
                    </p>
                    <Badge variant="success" className="shrink-0 tabular-nums">
                      {Math.round(opp.opportunity_score ?? 0)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {opp.proposed_fee_range ?? "fee TBD"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-red-500" />
              High Impact Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stats.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open alerts. Crisis Monitor and News Impact findings appear
                here.
              </p>
            ) : (
              stats.alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-3">
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {alert.alert_type.replace(/_/g, " ")} ·{" "}
                    {formatDate(alert.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Recent AI Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No analysis runs yet — open a module and run your first
                analysis.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {stats.runs.map((run) => (
                  <li
                    key={run.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-muted/60"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                      <span className="truncate font-medium">
                        {run.analysis_type.replace(/_/g, " ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDate(run.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
