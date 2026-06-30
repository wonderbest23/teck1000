import { buildVerdictResult } from "@/lib/interior/verdict";
import type { PipelineContext, PipelineResult, PipelineStageResult } from "@/lib/interior/pipeline/types";
import { runCompatibilityStage } from "@/lib/interior/pipeline/stageCompatibility";
import { runDimensionStage } from "@/lib/interior/pipeline/stageDimensions";
import { runManufacturingStage } from "@/lib/interior/pipeline/stageManufacturing";
import { runOpeningInterferenceStage } from "@/lib/interior/pipeline/stageOpening";
import { runPlumbingElectricalStage } from "@/lib/interior/pipeline/stagePlumbing";
import type { FurnitureInput } from "@/lib/types";
import type { RoomMeasurement } from "@/lib/interior/types";

export function runValidationPipeline(
  input: FurnitureInput,
  roomMeasurement?: RoomMeasurement,
  context: PipelineContext = {},
): PipelineResult {
  const stages: PipelineStageResult[] = [
    runDimensionStage(input, roomMeasurement),
    runCompatibilityStage(input),
    runPlumbingElectricalStage(input, roomMeasurement),
    runOpeningInterferenceStage(input, context),
    runManufacturingStage(input, context),
  ];

  const issues = stages.flatMap((stage) => stage.issues);
  const verdictBundle = buildVerdictResult(issues);

  return {
    stages,
    ...verdictBundle,
  };
}
