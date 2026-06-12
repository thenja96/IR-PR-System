"use client";

// Source Intelligence Centre tabs: Manual Paste (unchanged MVP flow),
// URL Import (Phase 1), and Saved Sources (the existing library table,
// now with trust tier and origin columns).

import { useState } from "react";
import { FilePlus2, Library } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SourceDiscovery } from "@/components/client/source-discovery";
import {
  SourceAddTextDialog,
  type AddTextSource,
} from "@/components/client/source-add-text-dialog";

// Same threshold as the Source Picker: below this, extracted text is likely
// incomplete and worth replacing.
const LOW_TEXT_THRESHOLD = 800;
import { formatDate } from "@/lib/utils";
import {
  TRUST_TIER_SHORT_LABELS,
  USEFULNESS_LABELS,
  tierForDocumentType,
  usefulnessForDocumentType,
  type SourceTrustTier,
  type SourceUsefulness,
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
  source_usefulness?: string | null;
  companies: { company_name: string } | null;
}

export interface DiscoveryPrefill {
  companyId?: string;
  companyName?: string;
  stockCode?: string;
}

export function SourceIntelligenceTabs({
  sources,
  initialTab,
  discoveryPrefill,
}: {
  sources: SourceListRow[];
  initialTab?: string;
  discoveryPrefill?: DiscoveryPrefill;
}) {
  const validTabs = ["manual", "url", "discover", "saved"];
  const defaultTab = initialTab && validTabs.includes(initialTab) ? initialTab : "manual";
  const [addTextSource, setAddTextSource] = useState<AddTextSource | null>(null);
  return (
    <>
      {addTextSource && (
        <SourceAddTextDialog
          source={addTextSource}
          onClose={() => setAddTextSource(null)}
        />
      )}
      <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="manual">Manual Paste</TabsTrigger>
        <TabsTrigger value="url">URL Import</TabsTrigger>
        <TabsTrigger value="discover">Find Sources</TabsTrigger>
        <TabsTrigger value="saved">Saved Sources ({sources.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="manual">
        <SourceUploadForm />
      </TabsContent>

      <TabsContent value="url">
        <SourceUrlImport />
      </TabsContent>

      <TabsContent value="discover">
        <SourceDiscovery
          initialCompanyId={discoveryPrefill?.companyId}
          initialCompanyName={discoveryPrefill?.companyName}
          initialStockCode={discoveryPrefill?.stockCode}
        />
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
                    // Records created before migrations 0002/0003 have no stored
                    // tier/usefulness — derive display values from the doc type.
                    const tier = (doc.source_trust_tier ??
                      tierForDocumentType(doc.document_type)) as SourceTrustTier;
                    const usefulness = (doc.source_usefulness ??
                      usefulnessForDocumentType(doc.document_type)) as SourceUsefulness;
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
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant={TIER_BADGE_VARIANTS[tier] ?? "secondary"}>
                              {TRUST_TIER_SHORT_LABELS[tier] ?? tier}
                            </Badge>
                            <Badge variant="outline">
                              {USEFULNESS_LABELS[usefulness] ?? usefulness}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{doc.companies?.company_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex flex-col items-start gap-1">
                            <span>
                              {doc.source_domain ?? (doc.file_name ? "file upload" : "manual paste")}
                            </span>
                            {doc.retrieval_status === "manual_with_official_url" && (
                              <Badge variant="success">manual + official URL</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const textLength = doc.extracted_text?.trim().length ?? 0;
                            const lowQuality = textLength > 0 && textLength < LOW_TEXT_THRESHOLD;
                            const needsText = textLength === 0;
                            return (
                              <div className="flex flex-col items-start gap-1">
                                {needsText ? (
                                  <Badge variant="warning">
                                    {["pdf_link_only", "link_only", "fetch_failed", "extraction_failed"].includes(
                                      doc.retrieval_status ?? ""
                                    )
                                      ? "link only — paste text"
                                      : "file only"}
                                  </Badge>
                                ) : lowQuality ? (
                                  <Badge variant="warning">low text quality</Badge>
                                ) : (
                                  <Badge variant="success">text available</Badge>
                                )}
                                {(needsText || lowQuality) && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setAddTextSource(doc)}
                                  >
                                    <FilePlus2 className="h-3 w-3" />
                                    {needsText ? "Add text" : "Update text"}
                                  </Button>
                                )}
                              </div>
                            );
                          })()}
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
    </>
  );
}
