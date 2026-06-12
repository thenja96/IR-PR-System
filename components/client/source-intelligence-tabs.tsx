"use client";

// Source Intelligence Centre tabs: Manual Paste (unchanged MVP flow),
// URL Import (Phase 1), and Saved Sources (the existing library table,
// now with trust tier and origin columns).

import { Library } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceUploadForm } from "@/components/client/source-upload-form";
import { SourceUrlImport } from "@/components/client/source-url-import";
import { formatDate } from "@/lib/utils";
import {
  TRUST_TIER_SHORT_LABELS,
  tierForDocumentType,
  type SourceTrustTier,
} from "@/lib/sources/trust-tier";

const TIER_BADGE_VARIANTS: Record<SourceTrustTier, "success" | "info" | "warning" | "secondary"> = {
  tier_1: "success",
  tier_2: "info",
  tier_3: "warning",
  tier_4: "secondary",
};

export interface SourceListRow {
  id: string;
  document_title: string;
  document_type: string;
  file_name: string | null;
  source_date: string | null;
  created_at: string;
  extracted_text: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  source_trust_tier?: string | null;
  retrieval_status?: string | null;
  companies: { company_name: string } | null;
}

export function SourceIntelligenceTabs({ sources }: { sources: SourceListRow[] }) {
  return (
    <Tabs defaultValue="manual">
      <TabsList>
        <TabsTrigger value="manual">Manual Paste</TabsTrigger>
        <TabsTrigger value="url">URL Import</TabsTrigger>
        <TabsTrigger value="saved">Saved Sources ({sources.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="manual">
        <SourceUploadForm />
      </TabsContent>

      <TabsContent value="url">
        <SourceUrlImport />
      </TabsContent>

      <TabsContent value="saved">
        {sources.length === 0 ? (
          <EmptyState
            icon={Library}
            title="No sources yet"
            description="Add a source via Manual Paste or URL Import. Saved text is used directly by AI modules and cited by title."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trust tier</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Text</TableHead>
                    <TableHead>Source date</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((doc) => {
                    // Records created before migration 0002 have no stored tier —
                    // derive a display tier from the document type.
                    const tier = (doc.source_trust_tier ??
                      tierForDocumentType(doc.document_type)) as SourceTrustTier;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.source_url ? (
                            <a
                              href={doc.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {doc.document_title}
                            </a>
                          ) : (
                            doc.document_title
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{doc.document_type.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={TIER_BADGE_VARIANTS[tier] ?? "secondary"}>
                            {TRUST_TIER_SHORT_LABELS[tier] ?? tier}
                          </Badge>
                        </TableCell>
                        <TableCell>{doc.companies?.company_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.source_domain ?? (doc.file_name ? "file upload" : "manual paste")}
                        </TableCell>
                        <TableCell>
                          {doc.extracted_text ? (
                            <Badge variant="success">text available</Badge>
                          ) : (
                            <Badge variant="warning">
                              {doc.retrieval_status === "pdf_link_only" ? "link only" : "file only"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(doc.source_date)}</TableCell>
                        <TableCell>{formatDate(doc.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
