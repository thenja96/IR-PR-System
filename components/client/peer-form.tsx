"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PeerForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    peer_company_name: "",
    peer_stock_code: "",
    peer_sector: "",
    reason_for_comparison: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("company_peers")
        .insert({ ...form, company_id: companyId });
      if (insertError) throw insertError;
      setForm({
        peer_company_name: "",
        peer_stock_code: "",
        peer_sector: "",
        reason_for_comparison: "",
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add peer.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add peer
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Peer company name *</Label>
        <Input
          required
          value={form.peer_company_name}
          onChange={(e) => setForm((p) => ({ ...p, peer_company_name: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Stock code</Label>
        <Input
          value={form.peer_stock_code}
          onChange={(e) => setForm((p) => ({ ...p, peer_stock_code: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Sector</Label>
        <Input
          value={form.peer_sector}
          onChange={(e) => setForm((p) => ({ ...p, peer_sector: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Reason for comparison</Label>
        <Input
          value={form.reason_for_comparison}
          onChange={(e) => setForm((p) => ({ ...p, reason_for_comparison: e.target.value }))}
        />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save peer
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
