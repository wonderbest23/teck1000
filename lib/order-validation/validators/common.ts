import { productRules } from "@/lib/rules";
import { validateFurnitureInput } from "@/lib/interior/validatePreview";
import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

/** 공통 치수/소재 검증 + 기존 인테리어 검증 파이프라인(가능/주의/불가/제작문의) 흡수 */
export function validateCommonFields(input: FurnitureInput, issues: OrderIssue[]) {
  const rules = productRules[input.productType];

  const dims: Array<{ field: keyof FurnitureInput; label: string; min: number; max: number }> = [
    { field: "width_mm", label: "가로", min: rules.minWidth, max: rules.maxWidth },
    { field: "height_mm", label: "높이", min: rules.minHeight, max: rules.maxHeight },
    { field: "depth_mm", label: "깊이", min: rules.minDepth, max: rules.maxDepth },
  ];
  for (const dim of dims) {
    const value = Number(input[dim.field] ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      issues.push({ code: `MISSING_${String(dim.field).toUpperCase()}`, level: "error", message: `${dim.label} 치수를 입력해주세요.`, field: dim.field as string, blocksOrder: true, source: "missing_input" });
    } else if (value < dim.min || value > dim.max) {
      issues.push({ code: `OUT_OF_RANGE_${String(dim.field).toUpperCase()}`, level: "error", message: `${rules.label} ${dim.label}는 ${dim.min}~${dim.max}mm 범위만 제작 가능합니다.`, field: dim.field as string, blocksOrder: true, source: "standard" });
    }
  }

  if (!input.material?.trim()) {
    issues.push({ code: "MISSING_MATERIAL", level: "error", message: "소재를 선택해주세요.", field: "material", blocksOrder: true, source: "missing_input" });
  }

  // 기존 인테리어 검증 파이프라인 결과를 주문 검증으로 변환
  const base = validateFurnitureInput(input);
  for (const issue of base.issues) {
    if (issue.verdict === "가능") continue;
    issues.push({
      code: issue.code ?? "PIPELINE_ISSUE",
      level: issue.verdict === "불가" ? "error" : "warning",
      message: issue.message,
      blocksOrder: issue.verdict === "불가",
      requiresReview: issue.verdict === "주의",
      requiresInquiry: issue.verdict === "제작문의",
      source: "standard",
    });
  }
}
