/**
 * 데이터 검증 제작 파이프라인 설계 기준서 — 도입 검증 스크립트
 * 실행: npx tsx scripts/test-pipeline-standard.mjs
 */
import { buildBomLines, buildCutPlanLines } from "../lib/interior/bomPipeline.ts";
import { BOARD_MATERIAL_MASTERS } from "../lib/interior/masters/boardMaterials.ts";
import { getApplianceMaster } from "../lib/interior/masters/appliances.ts";
import { getPlantProfile, isPlantProfileReadyForCut } from "../lib/interior/masters/plantProfiles.ts";
import { runValidationPipeline } from "../lib/interior/pipeline/runPipeline.ts";
import { PIPELINE_STAGE_LABELS } from "../lib/interior/pipeline/types.ts";
import { BOARD_STANDARDS } from "../lib/platformConfig.ts";
import { defaultInput } from "../lib/data.ts";

const results = [];

function assert(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
  const mark = condition ? "✓" : "✗";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

// 1. 원판 기본 규격 1220×2440 + 보조 910×1820
assert(
  "기본 원판 1220×2440",
  BOARD_STANDARDS.primaryWidthMm === 1220 && BOARD_STANDARDS.primaryHeightMm === 2440,
);
assert(
  "보조 원판 910×1820 허용",
  BOARD_STANDARDS.altWidthMm === 910 && BOARD_STANDARDS.altHeightMm === 1820,
);
assert(
  "동화 PB/MDF E0 시드",
  BOARD_MATERIAL_MASTERS.some((b) => b.board_id === "DW_PB_18_1220x2440" && b.formaldehyde_grade === "E0"),
);

// 2. 5단계 파이프라인 구조
const stages = Object.keys(PIPELINE_STAGE_LABELS);
assert("5단계 검증 파이프라인", stages.length === 5, stages.join(", "));

const standardKitchen = runValidationPipeline({
  ...defaultInput,
  productType: "kitchen_base_cabinet",
  width_mm: 900,
  height_mm: 850,
  depth_mm: 600,
  has_door: true,
  door_count: 2,
  sink_option: "none",
});
assert("표준 주방 5단계 실행", standardKitchen.stages.length === 5);
assert(
  "치수 단계 판정",
  ["가능", "주의", "불가", "제작문의"].includes(standardKitchen.stages[0].verdict),
  `verdict=${standardKitchen.stages[0].verdict}`,
);

// 3. 공장 프로파일 미등록 → 제작문의 (hard rule)
const unregisteredPlant = runValidationPipeline(
  {
    ...defaultInput,
    productType: "kitchen_base_cabinet",
    width_mm: 900,
    height_mm: 850,
    depth_mm: 600,
    sink_option: "none",
  },
  undefined,
  { plant_id: "PLANT_DEFAULT", require_cut_finalization: true },
);
const mfgStage = unregisteredPlant.stages.find((s) => s.stage === "manufacturing");
assert(
  "kerf 미등록 공장 → 제작문의",
  mfgStage?.issues.some((i) => i.code === "MANUFACTURING_PROFILE_REQUIRED"),
  mfgStage?.verdict,
);

// 4. 식기세척기 개구부 불가
const dwFail = runValidationPipeline(
  { ...defaultInput, productType: "kitchen_full_set", width_mm: 2400, height_mm: 850, depth_mm: 600, sink_option: "none" },
  undefined,
  {
    appliances: [
      {
        category: "dishwasher",
        appliance_id: "DW_LG_BUILTIN_FAMILY_150",
        opening_width_mm: 590,
        opening_height_mm: 820,
        opening_depth_mm: 550,
        front_clearance_mm: 600,
      },
    ],
  },
);
assert(
  "식기세척기 폭 590 < 598 → 불가",
  dwFail.verdict === "불가",
  `verdict=${dwFail.verdict}`,
);

// 5. 식기세척기 도어 오픈 간섭
const dwDoor = runValidationPipeline(
  { ...defaultInput, productType: "kitchen_full_set", width_mm: 2400, height_mm: 850, depth_mm: 600, sink_option: "none" },
  undefined,
  {
    appliances: [
      {
        category: "dishwasher",
        appliance_id: "DW_LG_BUILTIN_FAMILY_150",
        opening_width_mm: 600,
        opening_height_mm: 850,
        opening_depth_mm: 560,
        front_clearance_mm: 500,
      },
    ],
  },
);
assert(
  "도어 오픈 500 < 590 → 불가",
  dwDoor.issues.some((i) => i.code.includes("front_clearance") || i.message.includes("도어 오픈")),
  dwDoor.verdict,
);

// 6. 가전 마스터 LG·삼성
assert("LG 식기세척기 마스터", getApplianceMaster("DW_LG_BUILTIN_FAMILY_150")?.opening_height_min_mm === 815);
assert("삼성 식기세척기 마스터", getApplianceMaster("DW_SAMSUNG_DW60J")?.opening_width_min_mm === 600);

// 7. BOM 출력 — 미지정 필드 유지
const bom = buildBomLines({ productType: "kitchen_full_set", sink_option: "single_780", sheet_count: 3, plant_id: "PLANT_DEFAULT" });
assert("BOM 라인 생성", bom.length >= 4);
assert(
  "엣지 두께 미지정",
  bom.some((line) => line.category === "edge" && line.source_status === "미지정"),
);
assert(
  "공장 프로파일 kerf 미지정",
  bom.some((line) => line.category === "plant_profile" && line.key_specs.includes("미지정")),
);

// 8. 재단지시서 — 공장 미등록 시 raw 미지정
const cutPlan = buildCutPlanLines(
  [{ name: "측판-L", width_mm: 600, height_mm: 850, quantity: 1, material: "PB 18T", color: "화이트" }],
  "base_drawer_600",
  "PLANT_DEFAULT",
);
assert("재단 raw_w 미지정", cutPlan[0]?.raw_w_mm === "미지정");

const cutOk = buildCutPlanLines(
  [{ name: "측판-L", width_mm: 600, height_mm: 850, quantity: 1, material: "PB 18T", color: "화이트" }],
  "base_drawer_600",
  "PLANT_REGISTERED",
);
assert("등록 공장 재단치 확정", cutOk[0]?.raw_w_mm === 600);

// 9. 등록 공장 기본값
assert("기본 plant PLANT_REGISTERED", isPlantProfileReadyForCut(getPlantProfile()));

const failed = results.filter((r) => !r.pass);
console.log("\n---");
console.log(`합계: ${results.length}건, 통과 ${results.length - failed.length}, 실패 ${failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
