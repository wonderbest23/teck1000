import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

export function validateShoeCabinet(input: FurnitureInput, issues: OrderIssue[]) {
  const doorCount = Math.max(1, input.door_count || 1);
  const doorWidth = input.width_mm / doorCount;
  if (doorWidth > 600) {
    issues.push({
      code: "SHOE_DOOR_TOO_WIDE",
      level: "warning",
      message: "문짝 1짝 폭이 600mm를 넘어 처짐이 생길 수 있습니다. 문짝 수를 늘리는 것을 권장합니다.",
      field: "door_count",
      blocksOrder: false,
      requiresReview: false,
      source: "standard",
    });
  }
  if ((input.bottom_space ?? 0) > 0 && (input.bottom_space ?? 0) < 15) {
    issues.push({
      code: "SHOE_TOE_KICK_TOO_LOW",
      level: "info",
      message: "하부 띄움이 15mm 미만이면 청소·환기에 불리합니다.",
      field: "bottom_space",
      blocksOrder: false,
      source: "standard",
    });
  }
}
