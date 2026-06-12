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

export function CompanyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    stock_code: "",
    bursa_market: "Main Market",
    sector: "",
    business_description: "",
    client_status: "prospect",
    assigned_pic: "",
    website: "",
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
        .eq("workspace_type", "client_ir_pr")
        .limit(1)
        .maybeSingle();
      if (wsError) throw wsError;
      if (!ws) {
        throw new Error(
          "No Client IR/PR workspace found. Run the seed SQL or create one in Settings."
        );
      }
      const { error: insertError } = await supabase.from("companies").insert({
        ...form,
        workspace_id: ws.id,
      });
      if (insertError) throw insertError;
      setOpen(false);
      setForm({
        company_name: "",
        stock_code: "",
        bursa_market: "Main Market",
        sector: "",
        business_description: "",
        client_status: "prospect",
        assigned_pic: "",
        website: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add company
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">New company</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Company name *</Label>
            <Input
              required
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="e.g. Chin Hin Group Berhad"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Stock code</Label>
            <Input
              value={form.stock_code}
              onChange={(e) => set("stock_code", e.target.value)}
              placeholder="e.g. 5273"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bursa market</Label>
            <Select
              value={form.bursa_market}
              onChange={(e) => set("bursa_market", e.target.value)}
            >
              <option>Main Market</option>
              <option>ACE Market</option>
              <option>LEAP Market</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sector</Label>
            <Input
              value={form.sector}
              onChange={(e) => set("sector", e.target.value)}
              placeholder="e.g. Building Materials"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Client status</Label>
            <Select
              value={form.client_status}
              onChange={(e) => set("client_status", e.target.value)}
            >
              <option value="prospect">Prospect</option>
              <option value="active_client">Active client</option>
              <option value="past_client">Past client</option>
              <option value="watchlist">Watchlist</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned PIC</Label>
            <Input
              value={form.assigned_pic}
              onChange={(e) => set("assigned_pic", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Website</Label>
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Business description</Label>
            <Textarea
              rows={3}
              value={form.business_description}
              onChange={(e) => set("business_description", e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create company
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
