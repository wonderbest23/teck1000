import { generateBoardCutPlan } from "@/lib/cutting";
import {
  CUT_STEP_LABELS,
  getActiveProcessProfile,
  type CutStepCode,
  type FactoryProcessProfile,
} from "@/lib/processStandards";
import { getActivePricingTier, PRICING_TIER_LABELS } from "@/lib/pricingTier";
import type { BoardCutPlan, CutSequenceStep, ManufacturingJob, Order, PackingLabel, Part } from "@/lib/types";

export function generatePackingLabels(orderId: string, parts: Part[], packingRule: string): PackingLabel[] {
  const groups = chunk(parts, 4);
  return groups.map((items, index) => ({
    box_number: index + 1,
    total_boxes: groups.length,
    items: items.map((part) => part.name).join(", "),
    caution: `주문 ${orderId} / ${packingRule}`,
  }));
}

export function generateCutSequence(boardCutPlan: BoardCutPlan, profile: FactoryProcessProfile): CutSequenceStep[] {
  const sheetCount = boardCutPlan.summaries.reduce((sum, summary) => sum + summary.sheet_count, 0);
  const partCount = boardCutPlan.placements.length;
  const edgePartCount = boardCutPlan.placements.filter((placement) => /문짝|도어/i.test(placement.part_name)).length;

  return profile.cutSequence.map((stepCode, index) => ({
    order: index + 1,
    step_code: stepCode,
    step_label: CUT_STEP_LABELS[stepCode],
    description: describeCutStep(stepCode, { sheetCount, partCount, edgePartCount, boardCutPlan }),
  }));
}

export function generateManufacturingJob(order: Order): ManufacturingJob {
  const profile = getActiveProcessProfile();
  const pricingTier = getActivePricingTier();
  const boardCutPlan = generateBoardCutPlan(order.quote.parts);

  return {
    orderId: order.id,
    generated_at: new Date().toISOString(),
    factory_code: profile.factoryCode,
    factory_label: profile.label,
    pricing_tier: pricingTier,
    pricing_tier_label: PRICING_TIER_LABELS[pricingTier],
    parts: order.quote.parts,
    edgeTasks: order.quote.edgeTasks,
    hardwareTasks: order.quote.hardwareTasks,
    boardCutPlan,
    cutSequence: generateCutSequence(boardCutPlan, profile),
    packing_rule: profile.packingRule,
    packingLabels: generatePackingLabels(order.order_number, order.quote.parts, profile.packingRule),
  };
}

function describeCutStep(
  stepCode: CutStepCode,
  context: { sheetCount: number; partCount: number; edgePartCount: number; boardCutPlan: BoardCutPlan },
) {
  const { sheetCount, partCount, edgePartCount, boardCutPlan } = context;

  switch (stepCode) {
    case "trim":
      return `원판 ${sheetCount}장 trim 정리 (공장 기준 여백 반영)`;
    case "rip":
      return `종재단 — ${boardCutPlan.summaries.map((summary) => `${summary.material} ${summary.sheet_count}장`).join(", ")}`;
    case "crosscut":
      return `횡재단 — 총 ${partCount}개 부품 치수 분해`;
    case "recut":
      return `재컷·사이즈 맞춤 — 회전 배치 ${boardCutPlan.placements.filter((placement) => placement.rotated).length}건 확인`;
    case "label":
      return `부품 라벨링 — 주문번호·부품명·개체 번호 부착 (${partCount}개)`;
    case "edge":
      return `엣지 가공 대기 — 문짝·노출면 ${edgePartCount}건 이송`;
    default:
      return "";
  }
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result.length ? result : [[]];
}
