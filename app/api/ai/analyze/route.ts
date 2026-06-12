// Server-side AI endpoint. The OpenRouter API key never leaves the server.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAnalysis } from "@/lib/ai/run-analysis";
import { PROMPT_TEMPLATES } from "@/lib/prompts/templates";
import { getSourceContextField } from "@/lib/ai/modules";
import { buildSourceContext } from "@/lib/sources/build-source-context";
import type { AnalyzeRequestBody } from "@/types/ai";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = (await request.json()) as AnalyzeRequestBody;

    if (!body.analysisType || !(body.analysisType in PROMPT_TEMPLATES)) {
      return NextResponse.json(
        { error: `Unknown analysis type: ${body.analysisType}` },
        { status: 400 }
      );
    }
    if (!body.inputs || typeof body.inputs !== "object") {
      return NextResponse.json(
        { error: "Missing analysis inputs." },
        { status: 400 }
      );
    }

    // Coerce all inputs to strings and cap total size.
    const inputs: Record<string, string> = {};
    let totalSize = 0;
    for (const [key, value] of Object.entries(body.inputs)) {
      const str = String(value ?? "");
      totalSize += str.length;
      inputs[key] = str;
    }
    if (totalSize > 200_000) {
      return NextResponse.json(
        { error: "Input too large. Please shorten the pasted material." },
        { status: 400 }
      );
    }

    // Saved-source injection (client workspace only). The built context goes
    // into the module's designated field; manually typed text in that field is
    // preserved as "Additional User Notes" so manual paste keeps working.
    const selectedSourceIds = Array.isArray(body.selectedSourceIds)
      ? body.selectedSourceIds
          .filter((id): id is string => typeof id === "string" && id.length > 0)
          .slice(0, 10)
      : [];
    if (selectedSourceIds.length > 0) {
      const template = PROMPT_TEMPLATES[body.analysisType];
      const contextField = getSourceContextField(body.analysisType);
      if (template.workspaceType === "client_ir_pr" && contextField) {
        const sourceContext = await buildSourceContext(selectedSourceIds);
        if (sourceContext) {
          const manualText = (inputs[contextField] ?? "").trim();
          inputs[contextField] =
            `SELECTED SOURCE DOCUMENTS\n\n${sourceContext}\n\n` +
            `ADDITIONAL USER NOTES\n${manualText || "None provided."}`;
        }
      }
    }

    const result = await runAnalysis({
      analysisType: body.analysisType,
      inputs,
      userId: user.id,
      workspaceId: body.workspaceId,
      companyId: body.companyId,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI analyze error:", err);
    const message =
      err instanceof Error ? err.message : "AI analysis failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
