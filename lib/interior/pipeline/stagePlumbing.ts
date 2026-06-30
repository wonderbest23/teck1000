import { buildStageVerdict } from "@/lib/interior/pipeline/stageUtils";
import type { PipelineStageResult } from "@/lib/interior/pipeline/types";
import { issue, whenCaution, whenSpecMissing } from "@/lib/interior/verdict";
import type { RoomMeasurement, ValidationIssue } from "@/lib/interior/types";
import type { FurnitureInput, ProductType } from "@/lib/types";

function isKitchenType(productType: ProductType) {
  return productType === "kitchen_base_cabinet" || productType === "kitchen_wall_cabinet" || productType === "kitchen_full_set";
}

export function runPlumbingElectricalStage(input: FurnitureInput, room?: RoomMeasurement): PipelineStageResult {
  const issues: ValidationIssue[] = [];

  if (!room || !isKitchenType(input.productType)) {
    return buildStageVerdict("plumbing_electrical", issues);
  }

  const hasWaterCoords =
    room.cold_water_x_mm != null &&
    room.cold_water_y_mm != null &&
    room.hot_water_x_mm != null &&
    room.hot_water_y_mm != null;
  const hasDrainCoords = room.drain_x_mm != null && room.drain_y_mm != null;

  if (room.drain_type && !hasDrainCoords) {
    issues.push(whenSpecMissing("배수 중심 좌표", "drain_position"));
  }

  if (input.sink_option && input.sink_option !== "none" && !hasDrainCoords) {
    issues.push(whenCaution("싱크 선택 시 배수 좌표 미입력 — 현장 급배수 확인 필요", "DRAIN_COORDS_MISSING", "drain_position"));
  }

  if (input.cooktop_option && input.cooktop_option !== "none" && !hasWaterCoords) {
    issues.push(whenCaution("쿡탑 선택 시 급수 좌표 미입력 — 현장 확인 필요", "WATER_COORDS_MISSING", "water_position"));
  }

  if (room.outlet_x_mm == null && (input.microwave_option || input.hood_option)) {
    issues.push(whenCaution("가전 선택 시 콘센트 좌표 미입력", "OUTLET_COORDS_MISSING", "outlet_position"));
  }

  if (hasDrainCoords && hasWaterCoords) {
    issues.push(issue("가능", "PLUMBING_COORDS_OK", "급수·배수 좌표 입력 확인", "plumbing_coords", "가능"));
  }

  return buildStageVerdict("plumbing_electrical", issues);
}
