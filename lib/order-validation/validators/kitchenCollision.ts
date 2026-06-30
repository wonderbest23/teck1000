import { clampModuleIndex, normalizeKitchenModules, getKitchenTemplate } from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

/** 주방 세트의 설비 타공 위치 충돌 검사 (배수·쿡탑·서랍 간섭) */
export function validateKitchenCollision(input: FurnitureInput, issues: OrderIssue[]) {
  if (input.productType !== "kitchen_full_set") return;

  const template = getKitchenTemplate(input.kitchen_template);
  const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
  const modules = layout.modules;
  if (modules.length === 0) return;
  const maxIndex = modules.length - 1;

  const sinkOn = Boolean(input.sink_option && input.sink_option !== "none");
  const cooktopOn = Boolean(input.cooktop_option && input.cooktop_option !== "none");
  const sinkIndex = clampModuleIndex(input.sink_module_index ?? template.sinkModuleIndex, maxIndex);
  const cooktopIndex = clampModuleIndex(input.cooktop_module_index ?? template.cooktopModuleIndex, maxIndex);

  // 1) 싱크볼과 쿡탑이 같은 칸 → 동시 설치 불가
  if (sinkOn && cooktopOn && sinkIndex === cooktopIndex) {
    issues.push({
      code: "SINK_COOKTOP_SAME_MODULE",
      level: "error",
      message: `${sinkIndex + 1}번 칸에 싱크볼과 쿡탑이 함께 배치되어 설치가 불가능합니다. 서로 다른 칸으로 옮겨주세요.`,
      field: "sink_module_index",
      blocksOrder: true,
      source: "factory_rule",
    });
  }

  // 2) 싱크볼 칸이 서랍장 → 배수관과 서랍 간섭
  if (sinkOn && layout.moduleTypes[sinkIndex] === "drawer") {
    issues.push({
      code: "SINK_ON_DRAWER_MODULE",
      level: "warning",
      message: `${sinkIndex + 1}번 싱크볼 칸이 서랍장으로 설정되어 배수관과 간섭합니다. 도어형으로 바꾸거나 검수가 필요합니다.`,
      field: "kitchen_module_types",
      blocksOrder: false,
      requiresReview: true,
      source: "factory_rule",
    });
  }

  // 3) 배수 위치(좌측벽 기준)가 싱크볼 칸 범위를 벗어남
  if (sinkOn && typeof input.drain_position_x_mm === "number" && input.drain_position_x_mm > 0) {
    let start = 0;
    for (let i = 0; i < sinkIndex; i += 1) start += modules[i];
    const end = start + modules[sinkIndex];
    if (input.drain_position_x_mm < start || input.drain_position_x_mm > end) {
      issues.push({
        code: "DRAIN_OUT_OF_SINK_MODULE",
        level: "error",
        message: `입력한 배수 위치(${input.drain_position_x_mm}mm)가 싱크볼 칸 범위(${start}~${Math.round(end)}mm)를 벗어납니다. 배수 위치 또는 싱크볼 칸을 맞춰주세요.`,
        field: "drain_position_x_mm",
        blocksOrder: true,
        source: "factory_rule",
      });
    }
  }
}
