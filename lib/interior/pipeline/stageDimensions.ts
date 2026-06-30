import { SPS_KHFC } from "@/lib/interior/spsKhfc";
import type { PipelineStageResult } from "@/lib/interior/pipeline/types";
import { issue, whenCaution, whenGeometricConflict } from "@/lib/interior/verdict";
import { getKitchenSetDimensions } from "@/lib/kitchen";
import { generateRuleWarnings } from "@/lib/rules";
import type { FurnitureInput, ProductType } from "@/lib/types";
import type { RoomMeasurement } from "@/lib/interior/types";
import { buildStageVerdict } from "@/lib/interior/pipeline/stageUtils";

function isKitchenType(productType: ProductType) {
  return productType === "kitchen_base_cabinet" || productType === "kitchen_wall_cabinet" || productType === "kitchen_full_set";
}

export function runDimensionStage(input: FurnitureInput, room?: RoomMeasurement): PipelineStageResult {
  const issues = generateRuleWarnings(input).map((warning) =>
    issue(warning.type === "error" ? "불가" : warning.type === "warning" ? "주의" : "가능", `LEGACY_${warning.type.toUpperCase()}`, warning.message),
  );

  if (isKitchenType(input.productType) && input.productType !== "kitchen_wall_cabinet") {
    if (input.height_mm < SPS_KHFC.baseAssembledHeightMinMm) {
      issues.push(whenGeometricConflict(`하부장 조립 높이가 SPS-KHFC 최소 ${SPS_KHFC.baseAssembledHeightMinMm}mm 미만입니다.`, "height_mm"));
    } else if (input.height_mm !== SPS_KHFC.baseAssembledHeightPreferredMm) {
      issues.push(
        whenCaution(
          `하부장 높이 ${input.height_mm}mm — SPS-KHFC 우선치수 ${SPS_KHFC.baseAssembledHeightPreferredMm}mm`,
          "SPS_BASE_HEIGHT",
          "height_mm",
        ),
      );
    }
    if (input.depth_mm < SPS_KHFC.baseDepthMinMm) {
      issues.push(whenGeometricConflict(`하부장 깊이 최소 ${SPS_KHFC.baseDepthMinMm}mm 미만입니다.`, "depth_mm"));
    }
  }

  if (input.productType === "kitchen_wall_cabinet" || input.productType === "kitchen_full_set") {
    const wallDepth = input.productType === "kitchen_full_set" ? getKitchenSetDimensions(input).wallDepthMm : input.depth_mm;
    if (wallDepth < SPS_KHFC.wallDepthMinMm || wallDepth > SPS_KHFC.wallDepthMaxMm) {
      issues.push(whenCaution(`상부장 깊이 ${wallDepth}mm — SPS-KHFC 권장 ${SPS_KHFC.wallDepthMinMm}~${SPS_KHFC.wallDepthMaxMm}mm`, "SPS_WALL_DEPTH", "depth_mm"));
    }
  }

  if (room && isKitchenType(input.productType)) {
    const widths = [room.wall_width_bottom_mm, room.wall_width_mid_mm, room.wall_width_top_mm].filter((v): v is number => v != null);
    if (widths.length >= 2) {
      const spread = Math.max(...widths) - Math.min(...widths);
      if (spread > 10) {
        issues.push(whenCaution(`벽면 폭 편차 ${spread}mm — 현장 수평/수직 확인 필요`, "ROOM_WIDTH_SPREAD"));
      }
      if (input.width_mm > Math.min(...widths)) {
        issues.push(whenGeometricConflict(`제품 폭 ${input.width_mm}mm가 실측 최소 벽폭 ${Math.min(...widths)}mm를 초과합니다.`, "width_mm"));
      }
    }
  }

  return buildStageVerdict("dimensions", issues);
}
