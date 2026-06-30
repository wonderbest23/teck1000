// 주문 전 검증 엔진 — validateOrderInput(input) 진입점.

import type { FurnitureInput } from "@/lib/types";
import { PRODUCT_REQUIREMENTS, type ConditionalRequirement } from "./productRequirements";
import { getChecklist } from "./checklists";
import { fieldLabel } from "./messages";
import { validateCommonFields } from "./validators/common";
import { validateShoeCabinet } from "./validators/shoeCabinet";
import { validateWardrobe } from "./validators/wardrobe";
import { validateKitchenBase } from "./validators/kitchenBase";
import { validateSinkBase } from "./validators/sinkBase";
import { validateCooktopBase } from "./validators/cooktopBase";
import { validateKitchenCollision } from "./validators/kitchenCollision";
import { validateKitchenFixtures } from "./validators/kitchenFixtures";
import type { OrderIssue, OrderValidationResult, OrderVerdict } from "./types";

export type { OrderValidationResult, OrderVerdict, OrderIssue, PreOrderChecklistItem } from "./types";
export { ORDER_VERDICT_LABELS, ORDER_VERDICT_CTA } from "./types";
export { PRODUCT_REQUIREMENTS } from "./productRequirements";

const NUMERIC_FIELDS = new Set(["width_mm", "height_mm", "depth_mm", "shelf_count", "drain_position_x_mm", "hood_position_x_mm"]);

function fieldPresent(input: FurnitureInput, field: string): boolean {
  if (field === "door_count") return !input.has_door || (input.door_count ?? 0) > 0;
  if (field === "site_photos") return (input.site_photos?.length ?? 0) > 0;
  const value = (input as Record<string, unknown>)[field];
  if (NUMERIC_FIELDS.has(field)) return typeof value === "number" && Number.isFinite(value) && value > 0;
  if (typeof value === "string") return value.trim().length > 0 && value !== "none";
  return value !== undefined && value !== null && value !== "";
}

function conditionTriggered(input: FurnitureInput, condition: ConditionalRequirement["when"]): boolean {
  const value = (input as Record<string, unknown>)[condition.field];
  if (condition.not !== undefined) return value !== undefined && value !== null && value !== condition.not;
  if (condition.gt !== undefined) return typeof value === "number" && value > condition.gt;
  return Boolean(value);
}

function runProductValidator(input: FurnitureInput, issues: OrderIssue[]) {
  switch (input.productType) {
    case "shoe_cabinet":
      validateShoeCabinet(input, issues);
      break;
    case "built_in_wardrobe":
      validateWardrobe(input, issues);
      break;
    case "kitchen_base_cabinet":
      validateKitchenBase(input, issues);
      validateSinkBase(input, issues);
      validateCooktopBase(input, issues);
      break;
    case "kitchen_full_set":
      validateKitchenBase(input, issues);
      validateSinkBase(input, issues);
      validateCooktopBase(input, issues);
      validateKitchenCollision(input, issues);
      validateKitchenFixtures(input, issues);
      break;
    case "kitchen_wall_cabinet":
      // 상부장 단품: 공통 검증 + 벽고정만
      break;
    default:
      break;
  }
}

export function validateOrderInput(input: FurnitureInput): OrderValidationResult {
  const issues: OrderIssue[] = [];
  const requirement = PRODUCT_REQUIREMENTS[input.productType];

  validateCommonFields(input, issues);
  runProductValidator(input, issues);

  // 필수 필드 누락 → 차단
  const requiredFields = [...requirement.requiredFields];
  const missingFields: string[] = [];
  for (const field of requirement.requiredFields) {
    if (!fieldPresent(input, field)) missingFields.push(field);
  }

  // 조건부 필수 (싱크볼/쿡탑 선택 시 모델·위치 등)
  for (const conditional of requirement.conditionalRequired ?? []) {
    if (!conditionTriggered(input, conditional.when)) continue;
    for (const field of conditional.fields) {
      requiredFields.push(field);
      if (!fieldPresent(input, field)) {
        missingFields.push(field);
        issues.push({
          code: `MISSING_${field.toUpperCase()}`,
          level: "error",
          message: `${conditional.reason} (${fieldLabel(field)} 필요)`,
          field,
          blocksOrder: true,
          source: "missing_input",
        });
      }
    }
  }
  for (const field of missingFields) {
    if (issues.some((issue) => issue.field === field && issue.blocksOrder)) continue;
    if (!requirement.requiredFields.includes(field)) continue;
    issues.push({
      code: `MISSING_${field.toUpperCase()}`,
      level: "error",
      message: `${fieldLabel(field)} 정보를 입력해주세요.`,
      field,
      blocksOrder: true,
      source: "missing_input",
    });
  }

  // 현장 사진은 '제작 확정 전' 필수 — 견적/접수는 사진 없이 가능, 검수 단계에서 확인
  if (requirement.requiresSitePhotos && !fieldPresent(input, "site_photos")) {
    issues.push({
      code: "SITE_PHOTOS_BEFORE_PRODUCTION",
      level: "info",
      message: "현장 사진은 제작 확정 전 검수 단계에서 확인합니다. 사진 없이 견적·검수 요청이 가능합니다.",
      field: "site_photos",
      blocksOrder: false,
      requiresReview: true,
      source: "standard",
    });
  }

  // 직접 주문 불가 제품 → 최소 검수
  if (!requirement.directOrderAllowed) {
    issues.push({
      code: "REQUIRES_REVIEW_PRODUCT",
      level: "info",
      message: "이 제품군은 제작 전 검수 후 진행됩니다.",
      blocksOrder: false,
      requiresReview: true,
      source: "factory_rule",
    });
  }

  // 소비자 + 고위험(주방/가전 포함)은 기본 검수
  const highRiskKitchen =
    (input.productType === "kitchen_full_set" || input.productType === "kitchen_base_cabinet") &&
    ((input.sink_option && input.sink_option !== "none") || (input.cooktop_option && input.cooktop_option !== "none"));
  if ((input.customer_type ?? "consumer") === "consumer" && highRiskKitchen) {
    issues.push({
      code: "CONSUMER_KITCHEN_REVIEW",
      level: "info",
      message: "일반 소비자 주방 설비 포함 주문은 안전을 위해 검수 후 진행됩니다.",
      blocksOrder: false,
      requiresReview: true,
      source: "factory_rule",
    });
  }

  return buildValidationResult(input, dedupeIssues(issues), requiredFields, missingFields);
}

function dedupeIssues(issues: OrderIssue[]): OrderIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = issue.message.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildValidationResult(
  input: FurnitureInput,
  issues: OrderIssue[],
  requiredFields: string[],
  missingFields: string[],
): OrderValidationResult {
  const hasBlocker = issues.some((issue) => issue.blocksOrder);
  const hasInquiry = issues.some((issue) => issue.requiresInquiry);
  const hasReview = issues.some((issue) => issue.requiresReview);

  let verdict: OrderVerdict;
  if (hasBlocker) verdict = "blocked";
  else if (hasInquiry) verdict = "inquiry_required";
  else if (hasReview) verdict = "needs_review";
  else verdict = "ready";

  return {
    verdict,
    canOrder: verdict !== "blocked",
    canPayNow: verdict === "ready",
    canRequestReview: verdict === "needs_review" || verdict === "inquiry_required",
    issues,
    requiredFields: Array.from(new Set(requiredFields)),
    missingFields: Array.from(new Set(missingFields)),
    checklist: getChecklist(input.productType),
  };
}
