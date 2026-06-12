import Link from "next/link";
import { Building2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CompanyForm } from "@/components/client/company-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Company } from "@/types/database";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "success" | "info" | "warning"> = {
  active_client: "success",
  prospect: "info",
  past_client: "warning",
  watchlist: "info",
};

export default async function CompaniesPage() {
  let companies: Company[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("companies")
        .select("*")
        .order("company_name");
      companies = (data ?? []) as Company[];
    } catch {
      companies = [];
    }
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Client and prospect profiles — sources, peers, AI insights, and opportunities live under each company."
      />

      <div className="mb-6">
        <CompanyForm />
      </div>

      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Add your first client or prospect company to start running IR/PR analysis."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Stock code</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>PIC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Link
                        href={`/client/companies/${company.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {company.company_name}
                      </Link>
                    </TableCell>
                    <TableCell>{company.stock_code ?? "—"}</TableCell>
                    <TableCell>{company.bursa_market ?? "—"}</TableCell>
                    <TableCell>{company.sector ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[company.client_status ?? ""] ?? "info"}>
                        {(company.client_status ?? "prospect").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{company.assigned_pic ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
