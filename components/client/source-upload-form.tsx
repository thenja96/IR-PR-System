"use client";

// Source Library upload: file to Supabase Storage ("sources" bucket) and/or
// manually pasted text. PDF text extraction is intentionally out of MVP scope —
// pasted text is the reliable path for AI analysis today.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { tierForDocumentType } from "@/lib/sources/trust-tier";
import type { Company } from "@/types/database";

const DOCUMENT_TYPES = [
  "annual_report",
  "quarterly_report",
  "investor_deck",
  "bursa_announcement",
  "press_release",
  "media_article",
  "price_volume_csv",
  "macro_note",
  "trading_note",
  "other",
];

export function SourceUploadForm() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Pick<Company, "id" | "company_name">[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    document_title: "",
    document_type: "annual_report",
    company_id: "",
    source_date: "",
    extracted_text: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("companies")
      .select("id, company_name")
      .order("company_name")
      .then(({ data }) => setCompanies(data ?? []));
  }, []);

  function set(name: string, value: string) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: ws, error: wsError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("workspace_type", "client_ir_pr")
        .limit(1)
        .maybeSingle();
      if (wsError) throw wsError;
      if (!ws) throw new Error("No Client IR/PR workspace found. Run the seed SQL first.");

      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;

      if (file) {
        const path = `${ws.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("sources")
          .upload(path, file);
        if (uploadError) throw uploadError;
        fileUrl = path;
        fileName = file.name;
        fileSize = file.size;
      }

      if (!file && !form.extracted_text.trim()) {
        throw new Error("Attach a file or paste the document text.");
      }

      const basePayload = {
        workspace_id: ws.id,
        company_id: form.company_id || null,
        document_type: form.document_type,
        document_title: form.document_title,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        extracted_text: form.extracted_text || null,
        source_date: form.source_date || null,
        uploaded_by: user?.id ?? null,
      };

      // Stamp Source Intelligence metadata (migration 0002). If the migration
      // has not been applied yet, retry with the original payload so manual
      // paste keeps working.
      let { error: insertError } = await supabase.from("source_documents").insert({
        ...basePayload,
        source_trust_tier: tierForDocumentType(form.document_type),
        retrieval_status: "manual",
      });
      if (insertError && /source_trust_tier|retrieval_status|schema cache/i.test(insertError.message)) {
        ({ error: insertError } = await supabase.from("source_documents").insert(basePayload));
      }
      if (insertError) throw insertError;

      setSuccess("Source saved.");
      setForm({
        document_title: "",
        document_type: "annual_report",
        company_id: "",
        source_date: "",
        extracted_text: "",
      });
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4 text-primary" /> Add source document
        </CardTitle>
        <CardDescription>
          Upload a file to Supabase Storage and/or paste the document text. For
          MVP, pasted text is what the AI analyses and cites.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Document title *</Label>
            <Input
              required
              value={form.document_title}
              onChange={(e) => set("document_title", e.target.value)}
              placeholder="e.g. Chin Hin Q1 FY2026 Quarterly Report"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select
              value={form.document_type}
              onChange={(e) => set("document_type", e.target.value)}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Company (optional)</Label>
            <Select
              value={form.company_id}
              onChange={(e) => set("company_id", e.target.value)}
            >
              <option value="">— Not company-specific —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source date</Label>
            <Input
              type="date"
              value={form.source_date}
              onChange={(e) => set("source_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>File (optional)</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="pt-1.5"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Document text (paste here for AI analysis)</Label>
            <Textarea
              rows={8}
              value={form.extracted_text}
              onChange={(e) => set("extracted_text", e.target.value)}
              placeholder="Paste the relevant sections of the document…"
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          {success && <p className="text-sm text-teal-700 sm:col-span-2">{success}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save source
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
