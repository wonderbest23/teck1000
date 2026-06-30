// 작업 1건의 경제성(원가·판매·이익·합판수)을 한 소스에서 계산 — 작업별/월합계/재고차감이 모두 이걸 재사용.
// client·server 양쪽에서 안전(순수 계산만).

import { calculateSummarySheetCost } from "@/lib/boardPricing";
import { generateBoardCutPlan } from "@/lib/cutting";
import { calculateQuote } from "@/lib/quote";
import type { FurnitureInput } from "@/lib/types";

export type SheetUsage = { specCode: string; material: string; count: number };

export type JobEconomics = {
  sheetCount: number; // 사용 합판 총 장수
  salePrice: number; // 판매가(고객가)
  totalCost: number; // 원가(원재작비 = 전체 제작 원가)
  profit: number; // 이익(벌 수 있는 돈) = 판매 − 원가
  materialCost: number; // 합판 자재 원가(계약가 기준)
  sheetsBySpec: SheetUsage[]; // 규격별 합판 장수(재고 차감용)
};

export function computeJobEconomics(input: FurnitureInput): JobEconomics {
  const q = calculateQuote(input);
  const summaries = generateBoardCutPlan(q.parts).summaries;
  return {
    sheetCount: q.sheetCount,
    salePrice: q.finalPrice,
    totalCost: q.totalCost,
    profit: q.finalPrice - q.totalCost,
    materialCost: summaries.reduce((sum, s) => sum + calculateSummarySheetCost(s, "contract"), 0),
    sheetsBySpec: summaries.map((s) => ({ specCode: s.sheet_spec_code, material: s.material, count: s.sheet_count })),
  };
}
