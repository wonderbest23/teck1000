/**
 * 동방씽크 플랫폼 공통 기준값 (ㅇ23ㅇ.docx Phase 1 고정 권장값)
 * 공장별 trim·인시·계약가는 관리자 설정(미지정 변수)으로 확장 예정
 */

import type { ProductType } from "@/lib/types";

export const BOARD_STANDARDS = {
  primaryWidthMm: 1220,
  primaryHeightMm: 2440,
  altWidthMm: 910,
  altHeightMm: 1820,
  defaultThicknessMm: 18,
  kerfMm: 3,
  /** 공장 trim 기본값 — 실제는 공장 설정으로 덮어씀 */
  trimWidthMm: 10,
  trimLengthMm: 10,
} as const;

export const KITCHEN_STANDARDS = {
  /** SPS-KHFC 우선치수 850mm */
  baseHeightMm: 850,
  baseDepthMm: 600,
  /** 바닥~상부장 상단 2100 - 하단 1300 */
  wallHeightMm: 800,
  wallDepthMm: 340,
  /** 바닥~상부장 하단 (SPS-KHFC C 최소) */
  wallBottomFromFloorMm: 1300,
  moduleWidthPresetsMm: [150, 200, 300, 450, 600, 900, 1000] as const,
  moduleWidthMinMm: 150,
  moduleWidthMaxMm: 1000,
  defaultModuleWidthMm: 600,
} as const;

export const WARDROBE_STANDARDS = {
  minTotalHeightMm: 2100,
  heightStepMm: 50,
  preferredDepthMm: 600,
  minDepthMm: 500,
  depthStepMm: 10,
} as const;

export const ENTRANCE_STANDARDS = {
  minTotalHeightMm: 2100,
  heightStepMm: 50,
  preferredDepthMm: 350,
  minDepthMm: 250,
  depthStepMm: 10,
} as const;

export const HARDWARE_STANDARDS = {
  hingeAngleDeg: 110,
  hingeCupDiaMm: 35,
  slideLengthMm: 450,
  slideLoadKg: 30,
} as const;

/** 견적 엔진 변수 (관리자 설정 연동 전 기본값) */
export const QUOTE_DEFAULTS = {
  marginRate: 0.15,
  edgePricePerM: 180,
  processingPricePerPart: 2000,
  cuttingPricePerJob: 15000,
  assemblyPricePerSet: 20000,
  packingBasePrice: 8000,
  packingPerExtraPart: 500,
  deliveryPrice: 30000,
  freePackingPartThreshold: 6,
} as const;

/** Phase 4: 인시 기반 공정비 (process_standards 시드와 동기화) */
export const PROCESS_QUOTE_STANDARDS = {
  hourlyRateWon: 25000,
  assemblyHoursBase: 0.5,
  assemblyHoursPerPart: 0.15,
  cuttingHoursPerSheet: 0.4,
  kitchenInstallHours: 10,
} as const;

/** Phase 4: 품목별 마진율 — 채널·복잡도 반영 */
export const PRODUCT_MARGIN_RATES = {
  custom_shelf: 0.12,
  gap_cabinet: 0.14,
  shoe_cabinet: 0.14,
  kitchen_base_cabinet: 0.15,
  kitchen_wall_cabinet: 0.15,
  kitchen_full_set: 0.18,
  kitchen_island: 0.16,
  built_in_wardrobe: 0.16,
} as const;

export type PlatformQuoteConfig = typeof QUOTE_DEFAULTS;

let quoteConfigOverride: Partial<PlatformQuoteConfig> = {};

export function getQuoteConfig(): PlatformQuoteConfig {
  return { ...QUOTE_DEFAULTS, ...quoteConfigOverride };
}

/** 테스트·관리자 연동용 — 추후 DB에서 로드 */
export function setQuoteConfigOverride(overrides: Partial<PlatformQuoteConfig>) {
  quoteConfigOverride = { ...quoteConfigOverride, ...overrides };
}

export function getCuttingConfig() {
  return {
    sheetWidthMm: BOARD_STANDARDS.primaryWidthMm,
    sheetHeightMm: BOARD_STANDARDS.primaryHeightMm,
    kerfMm: BOARD_STANDARDS.kerfMm,
    trimWidthMm: BOARD_STANDARDS.trimWidthMm,
    trimLengthMm: BOARD_STANDARDS.trimLengthMm,
  };
}

export function getKitchenWallInstallBottomMm() {
  return KITCHEN_STANDARDS.wallBottomFromFloorMm;
}

export function snapKitchenModuleWidthMm(widthMm: number) {
  const { moduleWidthMinMm, moduleWidthMaxMm, moduleWidthPresetsMm } = KITCHEN_STANDARDS;
  const clamped = Math.min(moduleWidthMaxMm, Math.max(moduleWidthMinMm, Math.round(widthMm)));
  let nearest: number = moduleWidthPresetsMm[0];
  let minDiff = Math.abs(clamped - nearest);
  for (const preset of moduleWidthPresetsMm) {
    const diff = Math.abs(clamped - preset);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = preset;
    }
  }
  return minDiff <= 25 ? nearest : clamped;
}

export function getBoardThicknessMm() {
  return BOARD_STANDARDS.defaultThicknessMm;
}

export function getProductMarginRate(productType: ProductType) {
  return PRODUCT_MARGIN_RATES[productType] ?? QUOTE_DEFAULTS.marginRate;
}
