import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

/** 쿡탑/가스렌지 포함 하부장 검증 (모델/연료는 productRequirements 조건부 필수로 차단됨) */
export function validateCooktopBase(input: FurnitureInput, issues: OrderIssue[]) {
  if (!input.cooktop_option || input.cooktop_option === "none") return;

  issues.push({
    code: "COOKTOP_SAFETY_REVIEW",
    level: "warning",
    message: "쿡탑/가스렌지 포함 주문은 벽과의 이격 거리·후드 정렬·콘센트 위치 검수가 필요합니다.",
    field: "cooktop_option",
    blocksOrder: false,
    requiresReview: true,
    source: "factory_rule",
  });

  if (input.energy_type === "gas") {
    issues.push({
      code: "GAS_INSTALL_INQUIRY",
      level: "warning",
      message: "가스 연결은 전문 시공이 필요합니다. 가스 배관 위치를 제조 문의로 확인해주세요.",
      field: "energy_type",
      blocksOrder: false,
      requiresInquiry: true,
      source: "factory_rule",
    });
  }
}
