import { Bell } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertForm } from "@/components/private/alert-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { Alert } from "@/types/database";

export const dynamic = "force-dynamic";

const levelVariant: Record<string, "info" | "warning" | "danger"> = {
  low: "info",
  medium: "warning",
  high: "danger",
  urgent: "danger",
};

export default async function AlertCentrePage() {
  let alerts: Alert[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      // Only private-workspace alerts belong here; RLS already restricts
      // private workspaces to the owner.
      alerts = (data ?? []) as Alert[];
    } catch {
      alerts = [];
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Alert Centre"
        description="Manual alerts for MVP — macro events, volatility, key levels, and discipline warnings. Real-time API alerts come later."
        badge="private only"
        badgeVariant="ai"
      />
      <div className="mb-6">
        <AlertForm />
      </div>
      {alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts"
          description="Create an alert for upcoming macro events, key levels, or discipline reminders."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Suggested action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.alert_title}</TableCell>
                    <TableCell>{alert.alert_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant={levelVariant[alert.alert_level] ?? "info"}>
                        {alert.alert_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {alert.suggested_action ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{alert.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(alert.created_at)}</TableCell>
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
