/**
 * SPS-KHFC 001-0438 붙박이식 싱크대 단체표준 (PDF 기준서)
 */
export const SPS_KHFC = {
  baseAssembledHeightMinMm: 700,
  baseAssembledHeightPreferredMm: 850,
  baseAssembledHeightStepMm: 10,
  baseDepthMinMm: 500,
  baseDepthPreferredMm: 600,
  baseDepthStepMm: 10,
  baseFrontLengthStepMm: 100,
  wallBottomFromFloorMinMm: 1300,
  wallBottomStepMm: 50,
  wallTopFromFloorMinMm: 1900,
  wallTopPreferredMm: 2100,
  wallTopStepMm: 50,
  wallDepthMinMm: 300,
  wallDepthMaxMm: 350,
  toeKickMinMm: 50,
  toeKickPreferredAt850Mm: 150,
  bodyTolerancePlusMm: 1,
  bodyToleranceMinusMm: 2,
  generalToleranceMm: 2,
  adjustableLegToleranceMm: 10,
} as const;

export const KS_WOOD_BODY_RULES = {
  plywood: "KS F 3101 E0 준내수 1급 이상",
  surfacePlywood: "KS F 3106 E0 준내수 1급 이상",
  mdf: "KS F 3200 E0 이상",
  hdfBackMinThicknessMm: 3,
  maxMoisturePct: 13,
} as const;
