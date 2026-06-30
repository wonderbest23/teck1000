import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

/** 싱크볼 포함 하부장 검증 (모델/배수 위치는 productRequirements의 조건부 필수로 차단됨) */
export function validateSinkBase(input: FurnitureInput, issues: OrderIssue[]) {
  if (!input.sink_option || input.sink_option === "none") return;

  if ((input.drawer_module_count ?? 0) > 0) {
    issues.push({
      code: "SINK_BASE_DRAWER_REVIEW",
      level: "warning",
      message: "싱크볼 하부장에 서랍을 넣는 경우 배수관 간섭 검수가 필요합니다.",
      field: "drawer_module_count",
      blocksOrder: false,
      requiresReview: true,
      source: "factory_rule",
    });
  }

  if (input.width_mm / Math.max(1, input.door_count || 1) < 600) {
    issues.push({
      code: "SINK_MODULE_TOO_NARROW",
      level: "warning",
      message: "싱크볼이 들어가는 칸 폭이 600mm 미만이면 싱크볼/배수 설치가 어려워 검수가 필요합니다.",
      field: "width_mm",
      blocksOrder: false,
      requiresReview: true,
      source: "standard",
    });
  }
}
