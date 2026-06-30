import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

export function validateWardrobe(input: FurnitureInput, issues: OrderIssue[]) {
  // 천장 밀착/벽 조건은 현장 실측이 필요하므로 검수/문의 대상
  issues.push({
    code: "WARDROBE_SITE_REVIEW",
    level: "warning",
    message: "붙박이장은 좌·우 벽 높이차와 천장/바닥 수평에 따라 제작 치수가 달라져 현장 실측 검수가 필요합니다.",
    field: "site_photos",
    blocksOrder: false,
    requiresReview: true,
    source: "standard",
  });

  // 현장 실측이 입력된 경우 제작 치수와 비교 검증
  const leftH = input.room_height_left_mm;
  const rightH = input.room_height_right_mm;
  if (leftH && rightH) {
    const minWallHeight = Math.min(leftH, rightH);
    if (input.height_mm > minWallHeight) {
      issues.push({
        code: "WARDROBE_HEIGHT_OVER_WALL",
        level: "error",
        message: `제작 높이(${input.height_mm}mm)가 현장 최소 벽 높이(${minWallHeight}mm)보다 큽니다. 좁은 쪽 기준으로 낮춰주세요.`,
        field: "height_mm",
        blocksOrder: true,
        source: "standard",
      });
    }
    if (Math.abs(leftH - rightH) > 30) {
      issues.push({
        code: "WARDROBE_WALL_SKEW",
        level: "warning",
        message: `좌·우 벽 높이차가 ${Math.abs(leftH - rightH)}mm로 커 상단 필러/스크라이빙 검수가 필요합니다.`,
        blocksOrder: false,
        requiresReview: true,
        source: "standard",
      });
    }
  }
  const topW = input.room_width_top_mm;
  const bottomW = input.room_width_bottom_mm;
  if (topW && bottomW && input.width_mm > Math.min(topW, bottomW)) {
    issues.push({
      code: "WARDROBE_WIDTH_OVER_WALL",
      level: "error",
      message: `제작 폭(${input.width_mm}mm)이 현장 최소 폭(${Math.min(topW, bottomW)}mm)보다 큽니다.`,
      field: "width_mm",
      blocksOrder: true,
      source: "standard",
    });
  }

  if (input.open_type?.includes("슬라이딩") && input.height_mm > 2400) {
    issues.push({
      code: "WARDROBE_SLIDING_TOO_TALL",
      level: "warning",
      message: "슬라이딩 도어는 높이 2400mm를 넘으면 처짐·이탈 위험이 있어 검수가 필요합니다.",
      field: "height_mm",
      blocksOrder: false,
      requiresReview: true,
      source: "standard",
    });
  }
}
