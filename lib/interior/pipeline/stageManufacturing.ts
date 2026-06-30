import { getPlantProfile, isPlantProfileReadyForCut } from "@/lib/interior/masters/plantProfiles";
import { getSinkBowlByOptionId } from "@/lib/interior/masters/sinkBowls";
import { buildStageVerdict } from "@/lib/interior/pipeline/stageUtils";
import type { PipelineContext, PipelineStageResult } from "@/lib/interior/pipeline/types";
import { issue, whenSpecMissing } from "@/lib/interior/verdict";
import { getSinkOption } from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";

export function runManufacturingStage(input: FurnitureInput, context: PipelineContext): PipelineStageResult {
  const issues = [];
  const plant = getPlantProfile(context.plant_id);

  if (!isPlantProfileReadyForCut(plant)) {
    issues.push(
      issue(
        "제작문의",
        "MANUFACTURING_PROFILE_REQUIRED",
        `공장 프로파일(${plant.plant_id}): saw_kerf_mm 또는 trim_margin_mm 미등록 — 최종 재단치 확정 불가`,
        "plant_profile",
        "미등록",
      ),
    );
  } else {
    issues.push(issue("가능", "PLANT_PROFILE_OK", `${plant.plant_name} — kerf ${plant.saw_kerf_mm}mm, trim ${plant.trim_margin_mm}mm`, "plant_profile", "가능"));
  }

  const sinkOptionId = input.sink_option ?? getSinkOption().id;
  if (sinkOptionId !== "none") {
    const sink = getSinkBowlByOptionId(sinkOptionId);
    if (sink && (sink.cutout_w_mm == null || sink.cutout_d_mm == null)) {
      issues.push(
        issue(
          "제작문의",
          "CUTOUT_TECH_REF",
          "상판 싱크 컷아웃 — tech_ref(제조사 도면) 미등록, final_cut 계산 보류",
          "countertop_cutout",
          "미등록",
        ),
      );
    }
  }

  if (context.require_cut_finalization && !isPlantProfileReadyForCut(plant)) {
    issues.push(whenSpecMissing("재단 최종치", "final_cut"));
  }

  return buildStageVerdict("manufacturing", issues);
}
