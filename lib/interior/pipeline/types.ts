import type { ValidationIssue, VerdictLevel } from "@/lib/interior/types";

export type PipelineStageCode =
  | "dimensions"
  | "compatibility"
  | "plumbing_electrical"
  | "opening_interference"
  | "manufacturing";

export const PIPELINE_STAGE_LABELS: Record<PipelineStageCode, string> = {
  dimensions: "1. 치수 검증",
  compatibility: "2. 제품 호환 검증",
  plumbing_electrical: "3. 급배수·전기 검증",
  opening_interference: "4. 열림·간섭 검증",
  manufacturing: "5. 공장 재단 가능성 검증",
};

export type PipelineStageResult = {
  stage: PipelineStageCode;
  stage_label: string;
  verdict: VerdictLevel;
  issues: ValidationIssue[];
};

export type PipelineContext = {
  plant_id?: string;
  appliances?: ApplianceSlot[];
  require_cut_finalization?: boolean;
};

export type ApplianceSlot = {
  category: "dishwasher" | "oven" | "microwave" | "hood" | "cooktop";
  appliance_id: string;
  opening_width_mm?: number;
  opening_height_mm?: number;
  opening_depth_mm?: number;
  front_clearance_mm?: number;
  toe_kick_height_mm?: number;
};

export type PipelineResult = {
  stages: PipelineStageResult[];
  issues: ValidationIssue[];
  verdict: VerdictLevel;
  canAutoApprove: boolean;
  canSubmitOrder: boolean;
};
