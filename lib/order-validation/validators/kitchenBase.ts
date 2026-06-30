import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

/** 주방 하부장/세트 공통 하부 구조·깊이 검증 */
export function validateKitchenBase(input: FurnitureInput, issues: OrderIssue[]) {
  const hasToeKick = Boolean(input.toe_kick_option && input.toe_kick_option !== "none");
  const hasLeg = Boolean(input.leg_option && input.leg_option !== "none");
  if (!hasToeKick && !hasLeg) {
    issues.push({
      code: "MISSING_BASE_SUPPORT",
      level: "warning",
      message: "하부장은 다리(레그) 또는 걸레받이 지지 구조가 필요합니다. 걸레받이 옵션을 켜거나 다리를 선택해주세요.",
      field: "toe_kick_option",
      blocksOrder: false,
      requiresReview: true,
      source: "factory_rule",
    });
  }
  if (input.total_wall_length_mm && input.width_mm > input.total_wall_length_mm) {
    issues.push({
      code: "KITCHEN_WIDTH_OVER_WALL",
      level: "error",
      message: `제작 폭(${input.width_mm}mm)이 입력한 설치 벽 길이(${input.total_wall_length_mm}mm)를 초과합니다.`,
      field: "width_mm",
      blocksOrder: true,
      source: "standard",
    });
  }

  if (input.depth_mm < 500) {
    issues.push({
      code: "KITCHEN_BASE_DEPTH_TOO_SMALL",
      level: "warning",
      message: "하부장 깊이가 일반 주방 기준(500mm)보다 얕아 상판/배관 간섭 검수가 필요합니다.",
      field: "depth_mm",
      blocksOrder: false,
      requiresReview: true,
      source: "standard",
    });
  }
}
