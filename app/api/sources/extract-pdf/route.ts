// Extracts text from an uploaded PDF (multipart form, field "file") so the
// Manual Paste tab can fill its text box from an attached annual report,
// quarterly report, deck, circular, prospectus, or sustainability report.
// Returns text only — saving still happens through the existing form flow.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/sources/extract-pdf";

export const maxDuration = 60;

const MAX_PDF_BYTES = 15_000_000;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: "Only PDF files are supported for text extraction." },
        { status: 400 }
      );
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "PDF exceeds the 15 MB extraction limit. Paste the key sections manually." },
        { status: 400 }
      );
    }

    try {
      const extraction = await extractPdfText(await file.arrayBuffer());
      return NextResponse.json({
        text: extraction.text,
        pages: extraction.pages,
        textLength: extraction.text.length,
        textQuality: extraction.quality,
        note:
          extraction.quality === "none"
            ? "No selectable text found — this is likely a scanned or image-based PDF. Paste the key sections manually."
            : extraction.quality === "low"
              ? "Very little text was extracted — the PDF may be mostly scanned images. Review and add missing sections."
              : null,
      });
    } catch (err) {
      console.error("Uploaded PDF extraction failed:", err);
      return NextResponse.json(
        { error: "PDF text extraction failed (the file may be corrupted or protected). Paste the key sections manually." },
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("extract-pdf error:", err);
    return NextResponse.json({ error: "PDF extraction failed unexpectedly." }, { status: 500 });
  }
}
