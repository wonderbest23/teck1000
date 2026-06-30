import { runValidationPipeline } from "@/lib/interior/pipeline/runPipeline";
import type { PipelineContext } from "@/lib/interior/pipeline/types";
import type { PreviewRequest, RoomMeasurement, VerdictResult } from "@/lib/interior/types";
import type { FurnitureInput } from "@/lib/types";

function toPipelineContext(request?: Partial<PreviewRequest>): PipelineContext {
  return {
    plant_id: request?.plant_id,
    appliances: request?.appliances,
    require_cut_finalization: request?.require_cut_finalization,
  };
}

export function validateFurnitureInput(
  input: FurnitureInput,
  roomMeasurement?: RoomMeasurement,
  context?: PipelineContext,
): VerdictResult {
  const pipeline = runValidationPipeline(input, roomMeasurement, context);
  return {
    verdict: pipeline.verdict,
    issues: pipeline.issues,
    canAutoApprove: pipeline.canAutoApprove,
    canSubmitOrder: pipeline.canSubmitOrder,
  };
}

export function validatePreviewRequest(request: PreviewRequest) {
  const pipeline = runValidationPipeline(request.input, request.room_measurement, toPipelineContext(request));
  return {
    verdict: pipeline.verdict,
    issues: pipeline.issues,
    canAutoApprove: pipeline.canAutoApprove,
    canSubmitOrder: pipeline.canSubmitOrder,
    pipeline,
  };
}

export function validateFurnitureInputWithPipeline(
  input: FurnitureInput,
  roomMeasurement?: RoomMeasurement,
  context?: PipelineContext,
) {
  return runValidationPipeline(input, roomMeasurement, context);
}
