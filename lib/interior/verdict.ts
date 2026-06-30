import type { ValidationIssue, VerdictLevel, VerdictResult } from "@/lib/interior/types";

const VERDICT_RANK: Record<VerdictLevel, number> = {
  가능: 0,
  주의: 1,
  제작문의: 2,
  불가: 3,
};

export function mergeVerdict(current: VerdictLevel, next: VerdictLevel): VerdictLevel {
  return VERDICT_RANK[next] > VERDICT_RANK[current] ? next : current;
}

export function buildVerdictResult(issues: ValidationIssue[]): VerdictResult {
  const verdict = issues.reduce<VerdictLevel>((acc, issue) => mergeVerdict(acc, issue.verdict), "가능");
  return {
    verdict,
    issues,
    canAutoApprove: verdict === "가능",
    canSubmitOrder: verdict === "가능" || verdict === "주의",
  };
}

export function issue(
  verdict: VerdictLevel,
  code: string,
  message: string,
  field?: string,
  source_status?: ValidationIssue["source_status"],
): ValidationIssue {
  return { verdict, code, message, field, source_status };
}

/** 기준서 hard_rules */
export function whenSpecMissing(fieldLabel: string, field?: string) {
  return issue("제작문의", "SPEC_MISSING", `${fieldLabel} 공개 스펙이 없어 자동 판정할 수 없습니다.`, field, "미등록");
}

export function whenGeometricConflict(message: string, field?: string) {
  return issue("불가", "GEOMETRIC_CONFLICT", message, field);
}

export function whenCaution(message: string, code: string, field?: string) {
  return issue("주의", code, message, field);
}

export function whenOk(message: string, code: string) {
  return issue("가능", code, message);
}
