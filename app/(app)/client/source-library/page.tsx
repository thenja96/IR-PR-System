import { Library } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceUploadForm } from "@/components/client/source-upload-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SourceRow {
  id: string;
  document_title: string;
  document_type: string;
  file_name: string | null;
  source_date: string | null;
  created_at: string;
  extracted_text: string | null;
  companies: { company_name: string } | null;
}

export default async function SourceLibraryPage() {
  let sources: SourceRow[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("source_documents")
        .select(
          "id, document_title, document_type, file_name, source_date, created_at, extracted_text, companies(company_name)"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      sources = (data ?? []) as unknown as SourceRow[];
    } catch {
      sources = [];
    }
  }

  return (
    <div>
      <PageHeader
        title="Source Library"
        description="Annual reports, quarterly results, decks, announcements, articles, and notes. AI analysis cites these sources by title."
      />
      <div className="mb-6">
        <SourceUploadForm />
      </div>

      {sources.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No sources yet"
          description="Add your first source document above. Pasted text is used directly by AI modules."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead>Source date</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.document_title}</TableCell>
                    <TableCell>
                      <Badge variant="info">{doc.document_type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>{doc.companies?.company_name ?? "—"}</TableCell>
                    <TableCell>
                      {doc.extracted_text ? (
                        <Badge variant="success">text available</Badge>
                      ) : (
                        <Badge variant="warning">file only</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(doc.source_date)}</TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
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
