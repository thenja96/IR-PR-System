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

const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Revenge", "Bored", "Tired", "Other"];

export function JournalForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    trade_date: new Date().toISOString().slice(0, 16),
    asset_symbol: "XAUUSD",
    direction: "long",
    entry_price: "",
    exit_price: "",
    position_size: "",
    reason_for_entry: "",
    reason_for_exit: "",
    emotion_before: "Calm",
    emotion_after: "",
    result: "",
    lesson: "",
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

      const { error: insertError } = await supabase.from("trading_journal").insert({
        workspace_id: ws.id,
        trade_date: new Date(form.trade_date).toISOString(),
        asset_symbol: form.asset_symbol,
        direction: form.direction,
        entry_price: form.entry_price ? Number(form.entry_price) : null,
        exit_price: form.exit_price ? Number(form.exit_price) : null,
        position_size: form.position_size || null,
        reason_for_entry: form.reason_for_entry || null,
        reason_for_exit: form.reason_for_exit || null,
        emotion_before: form.emotion_before || null,
        emotion_after: form.emotion_after || null,
        result: form.result || null,
        lesson: form.lesson || null,
      });
      if (insertError) throw insertError;
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New journal entry
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New trade entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Trade date/time</Label>
            <Input
              type="datetime-local"
              value={form.trade_date}
              onChange={(e) => set("trade_date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Asset</Label>
            <Input
              value={form.asset_symbol}
              onChange={(e) => set("asset_symbol", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Direction</Label>
            <Select value={form.direction} onChange={(e) => set("direction", e.target.value)}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Position size</Label>
            <Input
              value={form.position_size}
              onChange={(e) => set("position_size", e.target.value)}
              placeholder="e.g. 0.5 lot"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Entry price</Label>
            <Input
              type="number"
              step="any"
              value={form.entry_price}
              onChange={(e) => set("entry_price", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Exit price</Label>
            <Input
              type="number"
              step="any"
              value={form.exit_price}
              onChange={(e) => set("exit_price", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Reason for entry</Label>
            <Textarea
              rows={2}
              value={form.reason_for_entry}
              onChange={(e) => set("reason_for_entry", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Reason for exit</Label>
            <Textarea
              rows={2}
              value={form.reason_for_exit}
              onChange={(e) => set("reason_for_exit", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Emotion before</Label>
            <Select value={form.emotion_before} onChange={(e) => set("emotion_before", e.target.value)}>
              {EMOTIONS.map((em) => (
                <option key={em}>{em}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Emotion after</Label>
            <Select value={form.emotion_after} onChange={(e) => set("emotion_after", e.target.value)}>
              <option value="">—</option>
              {EMOTIONS.map((em) => (
                <option key={em}>{em}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Result</Label>
            <Input
              value={form.result}
              onChange={(e) => set("result", e.target.value)}
              placeholder="e.g. +120 pips / -USD 80"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lesson</Label>
            <Input
              value={form.lesson}
              onChange={(e) => set("lesson", e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save entry
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
