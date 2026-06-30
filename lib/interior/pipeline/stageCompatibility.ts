import { getDoorSpecForMaterial } from "@/lib/interior/masters/doorSpecs";
import { getFaucetByOptionId } from "@/lib/interior/masters/faucets";
import { getSinkBowlByOptionId } from "@/lib/interior/masters/sinkBowls";
import { buildStageVerdict } from "@/lib/interior/pipeline/stageUtils";
import type { PipelineStageResult } from "@/lib/interior/pipeline/types";
import { issue, whenGeometricConflict, whenSpecMissing } from "@/lib/interior/verdict";
import { getSinkOption } from "@/lib/kitchen";
import type { FurnitureInput, ProductType } from "@/lib/types";

function isKitchenType(productType: ProductType) {
  return productType === "kitchen_base_cabinet" || productType === "kitchen_wall_cabinet" || productType === "kitchen_full_set";
}

export function runCompatibilityStage(input: FurnitureInput): PipelineStageResult {
  const issues = [];

  if (input.has_door) {
    const doorSpec = getDoorSpecForMaterial(input.material);
    if (!doorSpec) {
      issues.push(whenSpecMissing(`문재질(${input.material})`, "material"));
    } else {
      issues.push(
        issue(
          doorSpec.source_status === "미등록" ? "제작문의" : doorSpec.source_status,
          "DOOR_SPEC",
          `${doorSpec.label} — ${doorSpec.face_material}/${doorSpec.back_material}`,
          "material",
          doorSpec.source_status,
        ),
      );
      if (doorSpec.core_thickness_mm == null) {
        issues.push(whenSpecMissing("도어 코어 두께", "door_core_thickness"));
      }
    }
  }

  if (!isKitchenType(input.productType)) {
    return buildStageVerdict("compatibility", issues);
  }

  const sinkOptionId = input.sink_option ?? getSinkOption().id;
  if (sinkOptionId === "none") {
    return buildStageVerdict("compatibility", issues);
  }

  const sink = getSinkBowlByOptionId(sinkOptionId);
  if (!sink) {
    issues.push(whenSpecMissing("싱크볼", "sink_option"));
    return buildStageVerdict("compatibility", issues);
  }

  if (sink.overall_w_mm == null || sink.overall_d_mm == null || sink.overall_h_mm == null) {
    issues.push(issue("제작문의", "SINK_PRODUCT_FIELDS", "싱크볼 외형 치수가 공개되지 않아 자동 판정할 수 없습니다.", "sink_option", "미등록"));
  }

  if (sink.source_status === "미등록" || sink.min_base_cabinet_width_mm == null) {
    issues.push(
      issue(
        "제작문의",
        "SINK_MIN_WIDTH_UNKNOWN",
        `${sink.brand} ${sink.model_code}: 최소 하부장 폭이 공개되지 않아 장폭 자동 승인을 하지 않습니다.`,
        "sink_option",
        "미등록",
      ),
    );
  }

  if (sink.overall_w_mm != null && input.width_mm < sink.overall_w_mm) {
    issues.push(whenGeometricConflict(`하부장 폭 ${input.width_mm}mm가 싱크볼 외경 ${sink.overall_w_mm}mm보다 좁습니다.`, "width_mm"));
  }

  if (sink.cutout_w_mm == null || sink.cutout_d_mm == null) {
    issues.push(whenSpecMissing("싱크볼 컷아웃", "sink_cutout"));
  }

  const faucet = getFaucetByOptionId(input.faucet_option);
  if (faucet && faucet.id !== "none") {
    if (faucet.hose_length_mm == null) {
      issues.push(whenSpecMissing("수전 호스 길이", "faucet_hose_length"));
    }
    if (faucet.recommended_rear_clearance_mm == null) {
      issues.push(whenSpecMissing("수전 권장 뒤 여유", "faucet_rear_clearance"));
    }
  }

  return buildStageVerdict("compatibility", issues);
}
