// 주문 전 검증(Pre-Order Validation) 타입 정의.

export type OrderVerdict =
  | "ready" // 바로 주문 가능
  | "needs_review" // 검수 후 주문 가능
  | "inquiry_required" // 제조 문의 필요
  | "blocked"; // 필수값 누락 또는 제작 불가

export type IssueLevel = "error" | "warning" | "info";

export type IssueSource = "system" | "standard" | "factory_rule" | "missing_input";

export interface OrderIssue {
  code: string;
  level: IssueLevel;
  message: string;
  field?: string;
  blocksOrder: boolean;
  requiresReview?: boolean;
  requiresInquiry?: boolean;
  source?: IssueSource;
}

export type ChecklistCategory = "measurement" | "site" | "spec" | "responsibility" | "installation";

export interface PreOrderChecklistItem {
  id: string;
  label: string;
  required: boolean;
  category: ChecklistCategory;
}

export interface OrderValidationResult {
  verdict: OrderVerdict;
  canOrder: boolean;
  canPayNow: boolean;
  canRequestReview: boolean;
  issues: OrderIssue[];
  requiredFields: string[];
  missingFields: string[];
  checklist: PreOrderChecklistItem[];
}

export const ORDER_VERDICT_LABELS: Record<OrderVerdict, string> = {
  ready: "바로 주문 가능",
  needs_review: "검수 후 주문",
  inquiry_required: "제조 문의 필요",
  blocked: "주문 불가",
};

export const ORDER_VERDICT_CTA: Record<OrderVerdict, string> = {
  ready: "바로 주문하기",
  needs_review: "검수 요청하기",
  inquiry_required: "제조 문의 요청",
  blocked: "필수 정보 입력 필요",
};
