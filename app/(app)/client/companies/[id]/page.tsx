import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, Globe, Hash, Landmark, Layers, UserCircle2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CompanyTabs } from "@/components/client/company-tabs";
import { Badge } from "@/components/ui/badge";
import type {
  AiAnalysisRun,
  Company,
  CompanyPeer,
  ClientOpportunity,
  SourceDocument,
} from "@/types/database";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isSupabaseConfigured()) notFound();

  const supabase = createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!company) notFound();

  const [peers, sources, runs, opportunities] = await Promise.all([
    supabase
      .from("company_peers")
      .select("*")
      .eq("company_id", params.id)
      .order("created_at"),
    supabase
      .from("source_documents")
      .select("id, workspace_id, company_id, document_type, document_title, file_url, file_name, file_size, source_date, uploaded_by, created_at, updated_at, extracted_text")
      .eq("company_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_analysis_runs")
      .select("*")
      .eq("company_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("client_opportunities")
      .select("*")
      .eq("company_id", params.id)
      .order("opportunity_score", { ascending: false }),
  ]);

  const c = company as Company;
  const isActiveClient = c.client_status === "active_client";

  const profileChips = [
    { icon: Hash, label: "Stock code", value: c.stock_code },
    { icon: Landmark, label: "Market", value: c.bursa_market },
    { icon: Layers, label: "Sector", value: c.sector },
    { icon: UserCircle2, label: "PIC", value: c.assigned_pic },
  ].filter((chip) => chip.value);

  return (
    <div>
      {/* Client intelligence profile header */}
      <section className="relative mb-6 overflow-hidden rounded-xl border border-navy-border bg-navy text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(500px 200px at 90% -30%, rgba(20,184,166,0.3), transparent)",
          }}
        />
        <div className="relative flex flex-wrap items-start gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-lg font-bold text-navy shadow-lg shadow-teal-500/20">
            {initials(c.company_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                {c.company_name}
              </h1>
              <Badge
                variant={isActiveClient ? "success" : "info"}
                className={
                  isActiveClient
                    ? "bg-teal-500/20 text-teal-300"
                    : "bg-blue-500/20 text-blue-300"
                }
              >
                {(c.client_status ?? "prospect").replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {profileChips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400"
                  >
                    <Icon className="h-3.5 w-3.5 text-teal-400/80" />
                    <span className="text-slate-500">{chip.label}:</span>
                    <span className="font-medium text-slate-200">
                      {chip.value}
                    </span>
                  </span>
                );
              })}
            </div>
            {c.business_description && (
              <p className="mt-2.5 line-clamp-2 max-w-3xl text-[13px] leading-relaxed text-slate-400">
                {c.business_description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={`/client/source-library?${new URLSearchParams({
                tab: "discover",
                companyId: c.id,
                companyName: c.company_name,
                ...(c.stock_code ? { stockCode: c.stock_code } : {}),
              }).toString()}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/90 px-3 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-teal-400"
            >
              <Compass className="h-3.5 w-3.5" /> Find latest sources
            </Link>
            {c.website && (
              <Link
                href={c.website}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/15"
              >
                <Globe className="h-3.5 w-3.5 text-teal-400" /> Website
              </Link>
            )}
          </div>
        </div>
        {/* Mini stat strip */}
        <div className="relative grid grid-cols-2 gap-px border-t border-white/10 bg-white/5 sm:grid-cols-4">
          {[
            { label: "Source documents", value: sources.data?.length ?? 0 },
            { label: "Peers tracked", value: peers.data?.length ?? 0 },
            { label: "AI insights", value: runs.data?.length ?? 0 },
            { label: "Opportunities", value: opportunities.data?.length ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="bg-navy px-5 py-2.5">
              <p className="text-base font-semibold tabular-nums text-white">
                {stat.value}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <CompanyTabs
        company={c}
        peers={(peers.data ?? []) as CompanyPeer[]}
        sources={(sources.data ?? []) as SourceDocument[]}
        runs={(runs.data ?? []) as AiAnalysisRun[]}
        opportunities={(opportunities.data ?? []) as ClientOpportunity[]}
      />
    </div>
  );
}
