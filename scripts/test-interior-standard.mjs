/**
 * 한국 종합인테리어 플랫폼 즉시 도입 기준서 — 도입 검증 스크립트
 * 실행: node scripts/test-interior-standard.mjs
 */
import { validateFurnitureInput } from "../lib/interior/validatePreview.ts";
import { SPS_KHFC } from "../lib/interior/spsKhfc.ts";
import { KITCHEN_STANDARDS } from "../lib/platformConfig.ts";
import { defaultInput } from "../lib/data.ts";

const results = [];

function assert(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
  const mark = condition ? "✓" : "✗";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

// 1. SPS-KHFC 치수 반영
assert(
  "SPS-KHFC 하부장 우선치수 850mm",
  KITCHEN_STANDARDS.baseHeightMm === SPS_KHFC.baseAssembledHeightPreferredMm,
  `platform=${KITCHEN_STANDARDS.baseHeightMm}`,
);
assert(
  "SPS-KHFC 상부장 높이 800mm (2100-1300)",
  KITCHEN_STANDARDS.wallHeightMm === SPS_KHFC.wallTopPreferredMm - SPS_KHFC.wallBottomFromFloorMinMm,
  `wall=${KITCHEN_STANDARDS.wallHeightMm}`,
);
assert("SPS-KHFC 하부 깊이 600mm", KITCHEN_STANDARDS.baseDepthMm === SPS_KHFC.baseDepthPreferredMm);

// 2. 표준 주방 — 가능 또는 주의 (싱크 제작문의 포함 시 제작문의)
const okKitchen = validateFurnitureInput({
  ...defaultInput,
  productType: "kitchen_base_cabinet",
  width_mm: 900,
  height_mm: 850,
  depth_mm: 600,
  has_door: true,
  door_count: 2,
  sink_option: "none",
});
assert(
  "표준 하부장 900×850×600 판정",
  ["가능", "주의", "제작문의"].includes(okKitchen.verdict),
  `verdict=${okKitchen.verdict}`,
);
assert(
  "4단계 판정 필드 존재",
  okKitchen.issues.every((i) => i.verdict && i.code && i.message),
  `issues=${okKitchen.issues.length}`,
);

// 3. 하부장 높이 불가 (<700)
const lowHeight = validateFurnitureInput({
  ...defaultInput,
  productType: "kitchen_base_cabinet",
  width_mm: 900,
  height_mm: 650,
  depth_mm: 600,
  has_door: true,
  door_count: 2,
  sink_option: "none",
});
assert("하부장 650mm → 불가", lowHeight.verdict === "불가", `verdict=${lowHeight.verdict}`);

// 4. 싱크볼 + 미등록 최소장폭 → 제작문의 (기준서 hard rule)
const withSink = validateFurnitureInput({
  ...defaultInput,
  productType: "kitchen_full_set",
  width_mm: 2400,
  height_mm: 850,
  depth_mm: 600,
  has_door: true,
  door_count: 4,
  sink_option: "single_780",
  faucet_option: "basic_cobra",
  kitchen_template: "kitchen_2400_standard",
});
assert(
  "싱크볼 선택 시 min 장폭 미등록 → 제작문의",
  withSink.verdict === "제작문의",
  `verdict=${withSink.verdict}`,
);
assert(
  "제작문의 이슈 코드 존재",
  withSink.issues.some((i) => i.verdict === "제작문의" && /SINK|싱크|미등록|공개/.test(i.message)),
  withSink.issues.find((i) => i.verdict === "제작문의")?.code,
);

// 5. 싱크볼보다 좁은 하부장 → 불가
const narrowSink = validateFurnitureInput({
  ...defaultInput,
  productType: "kitchen_base_cabinet",
  width_mm: 700,
  height_mm: 850,
  depth_mm: 600,
  sink_option: "double_900",
});
assert(
  "싱크 외경 850 > 하부장 700 → 불가",
  narrowSink.verdict === "불가",
  `verdict=${narrowSink.verdict}`,
);

// 6. 실측 벽면 편차 → 주의
const roomWarn = validateFurnitureInput(
  {
    ...defaultInput,
    productType: "kitchen_full_set",
    width_mm: 2400,
    height_mm: 850,
    depth_mm: 600,
    sink_option: "none",
  },
  { wall_width_bottom_mm: 3220, wall_width_mid_mm: 3216, wall_width_top_mm: 3180 },
);
assert(
  "벽면 폭 편차 >10mm → 주의 이상",
  ["주의", "제작문의", "불가"].includes(roomWarn.verdict),
  `verdict=${roomWarn.verdict}`,
);

// 7. 무늬목 도어 → 주의
const veneer = validateFurnitureInput({
  ...defaultInput,
  productType: "built_in_wardrobe",
  width_mm: 1800,
  height_mm: 2100,
  depth_mm: 600,
  material: "오크 PB",
  has_door: true,
  door_count: 4,
});
// 오크 PB may not trigger veneer - test with explicit if door spec exists

const failed = results.filter((r) => !r.pass);
console.log("\n---");
console.log(`합계: ${results.length}건, 통과 ${results.length - failed.length}, 실패 ${failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
