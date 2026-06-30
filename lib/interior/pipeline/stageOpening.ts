import { getApplianceMaster } from "@/lib/interior/masters/appliances";
import { getFaucetByOptionId } from "@/lib/interior/masters/faucets";
import { getSinkBowlByOptionId } from "@/lib/interior/masters/sinkBowls";
import { buildStageVerdict } from "@/lib/interior/pipeline/stageUtils";
import type { ApplianceSlot, PipelineContext, PipelineStageResult } from "@/lib/interior/pipeline/types";
import { issue, whenGeometricConflict, whenSpecMissing } from "@/lib/interior/verdict";
import { getSinkOption } from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";

function validateDishwasher(slot: ApplianceSlot) {
  const issues = [];
  const appliance = getApplianceMaster(slot.appliance_id);
  if (!appliance) {
    issues.push(whenSpecMissing(`가전(${slot.appliance_id})`, "appliance_id"));
    return issues;
  }

  if (slot.opening_width_mm == null || slot.opening_height_mm == null || slot.opening_depth_mm == null) {
    issues.push(whenSpecMissing("식기세척기 설치 개구부", "appliance_opening"));
    return issues;
  }

  if (appliance.opening_width_min_mm != null && slot.opening_width_mm < appliance.opening_width_min_mm) {
    issues.push(whenGeometricConflict(`식기세척기 개구부 폭 ${slot.opening_width_mm}mm < 최소 ${appliance.opening_width_min_mm}mm`, "opening_width_mm"));
  }
  if (appliance.opening_width_max_mm != null && slot.opening_width_mm > appliance.opening_width_max_mm) {
    issues.push(whenCautionWidth(slot.opening_width_mm, appliance.opening_width_max_mm));
  }
  if (appliance.opening_height_min_mm != null && slot.opening_height_mm < appliance.opening_height_min_mm) {
    issues.push(whenGeometricConflict(`식기세척기 개구부 높이 ${slot.opening_height_mm}mm < 최소 ${appliance.opening_height_min_mm}mm`, "opening_height_mm"));
  }
  if (appliance.opening_depth_min_mm != null && slot.opening_depth_mm < appliance.opening_depth_min_mm) {
    issues.push(whenGeometricConflict(`식기세척기 개구부 깊이 ${slot.opening_depth_mm}mm < 최소 ${appliance.opening_depth_min_mm}mm`, "opening_depth_mm"));
  }
  if (
    appliance.door_open_clearance_mm != null &&
    slot.front_clearance_mm != null &&
    slot.front_clearance_mm < appliance.door_open_clearance_mm
  ) {
    issues.push(whenGeometricConflict(`도어 오픈 여유 ${slot.front_clearance_mm}mm < 필요 ${appliance.door_open_clearance_mm}mm`, "front_clearance_mm"));
  }
  if (
    appliance.toe_kick_height_min_mm != null &&
    appliance.toe_kick_height_max_mm != null &&
    slot.toe_kick_height_mm != null &&
    (slot.toe_kick_height_mm < appliance.toe_kick_height_min_mm || slot.toe_kick_height_mm > appliance.toe_kick_height_max_mm)
  ) {
    issues.push(
      issue(
        "주의",
        "TOE_KICK_BOUNDARY",
        `걸레받이 ${slot.toe_kick_height_mm}mm — 가전 가이드 ${appliance.toe_kick_height_min_mm}~${appliance.toe_kick_height_max_mm}mm 경계`,
        "toe_kick_height_mm",
      ),
    );
  }

  return issues;
}

function whenCautionWidth(actual: number, max: number) {
  return issue("주의", "DW_WIDTH_CAUTION", `식기세척기 개구부 폭 ${actual}mm — 설치 주의 구간(최대 ${max}mm)`, "opening_width_mm");
}

export function runOpeningInterferenceStage(input: FurnitureInput, context: PipelineContext): PipelineStageResult {
  const issues = [];

  for (const slot of context.appliances ?? []) {
    if (slot.category === "dishwasher") {
      issues.push(...validateDishwasher(slot));
    } else {
      const appliance = getApplianceMaster(slot.appliance_id);
      if (!appliance) {
        issues.push(whenSpecMissing(`가전(${slot.appliance_id})`, "appliance_id"));
        continue;
      }
      if (slot.opening_depth_mm != null && appliance.opening_depth_min_mm != null && slot.opening_depth_mm < appliance.opening_depth_min_mm) {
        issues.push(whenGeometricConflict(`${appliance.model_code} 개구부 깊이 미달`, "opening_depth_mm"));
      }
    }
  }

  const sinkOptionId = input.sink_option ?? getSinkOption().id;
  if (sinkOptionId !== "none") {
    const sink = getSinkBowlByOptionId(sinkOptionId);
    const hasDrawer = (input.drawer_module_count ?? 0) > 0 || input.kitchen_module_types?.includes("drawer");
    if (sink && hasDrawer && (sink.cutout_w_mm == null || sink.cutout_d_mm == null)) {
      issues.push(
        issue(
          "제작문의",
          "SINK_DRAIN_CENTER_REQUIRED",
          "서랍형 하부장 + 싱크볼 — 드레인 중심/컷아웃 미등록 시 자동 판정 불가",
          "sink_cutout",
          "미등록",
        ),
      );
    }
  }

  const faucet = getFaucetByOptionId(input.faucet_option);
  if (faucet?.installation_type === "corner" || faucet?.model_code.includes("CORNER")) {
    issues.push(issue("주의", "FAUCET_CORNER_CLEARANCE", "코너 수전 — 상판·핸들 간섭 주의", "faucet_option"));
  }

  return buildStageVerdict("opening_interference", issues);
}
