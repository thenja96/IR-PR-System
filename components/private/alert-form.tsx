"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ALERT_TYPES = [
  "macro_event",
  "high_volatility",
  "gold_near_support",
  "gold_near_resistance",
  "dxy_conflict",
  "yield_conflict",
  "vix_spike",
  "journal_discipline",
  "overtrading_warning",
];

export function AlertForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    alert_type: "macro_event",
    alert_title: "",
    alert_level: "medium",
    alert_summary: "",
    suggested_action: "",
  });

  function set(name: string, value: string) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("workspace_type", "private_market")
        .limit(1)
        .maybeSingle();
      if (wsError) throw wsError;
      if (!ws) throw new Error("No Private Market workspace found. Run the seed SQL first.");

      const { error: insertError } = await supabase.from("alerts").insert({
        workspace_id: ws.id,
        ...form,
        status: "open",
      });
      if (insertError) throw insertError;
      setOpen(false);
      setForm({
        alert_type: "macro_event",
        alert_title: "",
        alert_level: "medium",
        alert_summary: "",
        suggested_action: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alert.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New alert
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New alert</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Alert type</Label>
            <Select value={form.alert_type} onChange={(e) => set("alert_type", e.target.value)}>
              {ALERT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={form.alert_level} onChange={(e) => set("alert_level", e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title *</Label>
            <Input
              required
              value={form.alert_title}
              onChange={(e) => set("alert_title", e.target.value)}
              placeholder="e.g. FOMC decision Wednesday — reduce size"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Summary</Label>
            <Textarea
              rows={2}
              value={form.alert_summary}
              onChange={(e) => set("alert_summary", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Suggested action</Label>
            <Input
              value={form.suggested_action}
              onChange={(e) => set("suggested_action", e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create alert
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
