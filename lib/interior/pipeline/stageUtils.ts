import type { ValidationIssue, VerdictLevel } from "@/lib/interior/types";
import { mergeVerdict } from "@/lib/interior/verdict";
import { PIPELINE_STAGE_LABELS, type PipelineStageCode, type PipelineStageResult } from "@/lib/interior/pipeline/types";

export function buildStageVerdict(stage: PipelineStageCode, issues: ValidationIssue[]): PipelineStageResult {
  const verdict = issues.reduce<VerdictLevel>((acc, row) => mergeVerdict(acc, row.verdict), "가능");
  return {
    stage,
    stage_label: PIPELINE_STAGE_LABELS[stage],
    verdict,
    issues,
  };
}
