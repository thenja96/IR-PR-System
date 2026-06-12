import { PageHeader } from "@/components/shared/page-header";
import { AnalysisRunner } from "@/components/ai/analysis-runner";
import { MODULES } from "@/lib/ai/modules";

export default function MediaInterviewQnaPage() {
  const m = MODULES.media_interview_qna;
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={m.title}
        description={m.description}
        badge="deliverable"
        badgeVariant="success"
      />
      <AnalysisRunner module={m} />
    </div>
  );
}
