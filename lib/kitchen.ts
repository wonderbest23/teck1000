import {
  KITCHEN_STANDARDS,
  snapKitchenModuleWidthMm,
} from "@/lib/platformConfig";
import type { FurnitureInput } from "@/lib/types";

export type KitchenTemplate = {
  id: string;
  name: string;
  width_mm: number;
  base_height_mm: number;
  base_depth_mm: number;
  wall_height_mm: number;
  wall_depth_mm: number;
  modules: number[];
  sinkModuleIndex: number;
  cooktopModuleIndex: number;
  description: string;
};

export type KitchenSetDimensions = {
  baseHeightMm: number;
  baseDepthMm: number;
  wallHeightMm: number;
  wallDepthMm: number;
};

export type KitchenModuleType =
  | "sink_base"
  | "door"
  | "drawer"
  | "cooktop"
  | "gas"
  | "microwave"
  | "oven"
  | "dishwasher"
  | "pullout"
  | "open";

export const kitchenModuleTypeLabels: Record<KitchenModuleType, string> = {
  sink_base: "싱크장",
  door: "도어장",
  drawer: "서랍장",
  cooktop: "쿡탑장",
  gas: "가스장",
  microwave: "전자레인지장",
  oven: "오븐장",
  dishwasher: "식기세척기장",
  pullout: "레일장",
  open: "오픈장",
};

export const DEFAULT_KITCHEN_MODULE_WIDTH_MM = KITCHEN_STANDARDS.defaultModuleWidthMm;
export const MIN_KITCHEN_MODULE_WIDTH_MM = KITCHEN_STANDARDS.moduleWidthMinMm;
export const MAX_KITCHEN_MODULE_WIDTH_MM = KITCHEN_STANDARDS.moduleWidthMaxMm;
export const KITCHEN_MODULE_WIDTH_PRESETS_MM = KITCHEN_STANDARDS.moduleWidthPresetsMm;
export const MAX_KITCHEN_MODULE_COUNT = 8;

export const KITCHEN_DIMENSION_LIMITS = {
  baseHeight: { min: 700, max: 950, step: 10 },
  wallHeight: { min: 400, max: 1000, step: 10 },
  baseDepth: { min: 500, max: 700, step: 10 },
  wallDepth: { min: 280, max: 450, step: 10 },
} as const;

const K = KITCHEN_STANDARDS;

export function snapKitchenDimensionMm(valueMm: number, minMm: number, maxMm: number, stepMm = 10) {
  const fallback = minMm;
  const value = Number.isFinite(valueMm) ? valueMm : fallback;
  const snapped = Math.round(value / stepMm) * stepMm;
  return Math.min(maxMm, Math.max(minMm, snapped));
}

export function getKitchenSetDimensions(input: FurnitureInput, template = getKitchenTemplate(input.kitchen_template)): KitchenSetDimensions {
  return {
    baseHeightMm: snapKitchenDimensionMm(
      input.kitchen_base_height_mm ?? input.height_mm ?? template.base_height_mm,
      KITCHEN_DIMENSION_LIMITS.baseHeight.min,
      KITCHEN_DIMENSION_LIMITS.baseHeight.max,
      KITCHEN_DIMENSION_LIMITS.baseHeight.step,
    ),
    baseDepthMm: snapKitchenDimensionMm(
      input.kitchen_base_depth_mm ?? input.depth_mm ?? template.base_depth_mm,
      KITCHEN_DIMENSION_LIMITS.baseDepth.min,
      KITCHEN_DIMENSION_LIMITS.baseDepth.max,
      KITCHEN_DIMENSION_LIMITS.baseDepth.step,
    ),
    wallHeightMm: snapKitchenDimensionMm(
      input.kitchen_wall_height_mm ?? template.wall_height_mm,
      KITCHEN_DIMENSION_LIMITS.wallHeight.min,
      KITCHEN_DIMENSION_LIMITS.wallHeight.max,
      KITCHEN_DIMENSION_LIMITS.wallHeight.step,
    ),
    wallDepthMm: snapKitchenDimensionMm(
      input.kitchen_wall_depth_mm ?? template.wall_depth_mm,
      KITCHEN_DIMENSION_LIMITS.wallDepth.min,
      KITCHEN_DIMENSION_LIMITS.wallDepth.max,
      KITCHEN_DIMENSION_LIMITS.wallDepth.step,
    ),
  };
}

export const kitchenTemplates: KitchenTemplate[] = [
  {
    id: "kitchen_1800_basic",
    name: "기본 1800 세트",
    width_mm: 1800,
    base_height_mm: K.baseHeightMm,
    base_depth_mm: K.baseDepthMm,
    wall_height_mm: K.wallHeightMm,
    wall_depth_mm: K.wallDepthMm,
    modules: [600, 600, 600],
    sinkModuleIndex: 1,
    cooktopModuleIndex: 0,
    description: "소형 주방/원룸에 많이 쓰는 600 모듈 3개 구성",
  },
  {
    id: "kitchen_2400_standard",
    name: "표준 2400 세트",
    width_mm: 2400,
    base_height_mm: K.baseHeightMm,
    base_depth_mm: K.baseDepthMm,
    wall_height_mm: K.wallHeightMm,
    wall_depth_mm: K.wallDepthMm,
    modules: [600, 600, 600, 600],
    sinkModuleIndex: 2,
    cooktopModuleIndex: 0,
    description: "일반 가정 주방에 쓰기 좋은 600 모듈 4개 구성",
  },
  {
    id: "kitchen_3000_family",
    name: "패밀리 3000 세트",
    width_mm: 3000,
    base_height_mm: K.baseHeightMm,
    base_depth_mm: K.baseDepthMm,
    wall_height_mm: K.wallHeightMm,
    wall_depth_mm: K.wallDepthMm,
    modules: [600, 600, 600, 600, 600],
    sinkModuleIndex: 2,
    cooktopModuleIndex: 0,
    description: "넓은 주방용 600 모듈 5개 구성",
  },
  {
    // 상세페이지 구성예시 ① : 1200 개수대 서랍형 + 600 가스대 (상부장 600+300+600후드장)
    id: "kitchen_1800_sink_gas",
    name: "구성예시① 1800 (개수대+가스대)",
    width_mm: 1800,
    base_height_mm: K.baseHeightMm,
    base_depth_mm: K.baseDepthMm,
    wall_height_mm: K.wallHeightMm,
    wall_depth_mm: K.wallDepthMm,
    modules: [1200, 600],
    sinkModuleIndex: 0,
    cooktopModuleIndex: 1,
    description: "1200 개수대 서랍형 + 600 가스대 · 상부장 600/300/후드장",
  },
  {
    // 상세페이지 구성예시 ② : 600조리대 + 1200 개수대 서랍형 + 300조리대 + 600조리대
    id: "kitchen_2700_counter_sink",
    name: "구성예시② 2700 (조리대+개수대)",
    width_mm: 2700,
    base_height_mm: K.baseHeightMm,
    base_depth_mm: K.baseDepthMm,
    wall_height_mm: K.wallHeightMm,
    wall_depth_mm: K.wallDepthMm,
    modules: [600, 1200, 300, 600],
    sinkModuleIndex: 1,
    cooktopModuleIndex: 3,
    description: "600조리대 + 1200 개수대 서랍형 + 300조리대 + 600조리대",
  },
];

export const toeKickOptions = [
  { id: "none", name: "걸레받이 제외", price: 0, height_mm: 0 },
  { id: "standard_100", name: "걸레받이 100mm", price: 45000, height_mm: 100 },
];

export const countertopOptions = [
  { id: "none", name: "상판 제외", price: 0, material: "상판 제외", color: "-" },
  { id: "pt_white", name: "PT 인조대리석 화이트", price: 180000, material: "상판 품목", color: "화이트" },
  { id: "engineered_stone", name: "엔지니어드 스톤", price: 320000, material: "상판 품목", color: "스톤" },
  { id: "stainless", name: "스테인리스 상판", price: 260000, material: "상판 품목", color: "스테인리스" },
];

export const sinkOptions = [
  { id: "none", name: "싱크볼 제외", price: 0, material: "설비 품목", color: "-" },
  { id: "single_780", name: "싱크볼 780 싱글", price: 95000, material: "설비 품목", color: "스테인리스" },
  { id: "single_860", name: "싱크볼 860 싱글", price: 125000, material: "설비 품목", color: "스테인리스" },
  { id: "double_900", name: "싱크볼 900 더블", price: 185000, material: "설비 품목", color: "스테인리스" },
];

export const faucetOptions = [
  { id: "none", name: "수전 제외", price: 0, material: "설비 품목", color: "-" },
  { id: "basic_cobra", name: "기본 코브라 수전", price: 45000, material: "설비 품목", color: "크롬" },
  { id: "pullout", name: "인출식 수전", price: 95000, material: "설비 품목", color: "크롬" },
  { id: "black_pullout", name: "블랙 인출식 수전", price: 135000, material: "설비 품목", color: "블랙" },
];

export const hoodOptions = [
  { id: "none", name: "후드 제외", price: 0, material: "가전 품목", color: "-" },
  { id: "haatz_slide_600", name: "하츠 슬라이드 후드 600", price: 120000, material: "가전 품목", color: "실버" },
  { id: "haatz_chimney_600", name: "하츠 침니 후드 600", price: 260000, material: "가전 품목", color: "실버" },
  { id: "paseco_slim_600", name: "파세코 슬림 후드 600", price: 150000, material: "가전 품목", color: "실버" },
  { id: "haatz_chimney_900", name: "하츠 대형 침니 후드 900", price: 340000, material: "가전 품목", color: "실버" },
  { id: "wall_tower_900", name: "벽부형 대형 후드 900 (단일 설치)", price: 390000, material: "가전 품목", color: "스테인리스" },
  { id: "island_hood_900", name: "아일랜드 대형 후드 900", price: 450000, material: "가전 품목", color: "스테인리스" },
];

export type HoodShape = "slide" | "chimney" | "tower";

/** 후드 외형/폭 사양 — 3D 렌더에 사용 */
export function getHoodSpec(id?: string): { widthMm: number; shape: HoodShape } {
  switch (id) {
    case "haatz_chimney_600":
      return { widthMm: 600, shape: "chimney" };
    case "haatz_chimney_900":
      return { widthMm: 900, shape: "chimney" };
    case "wall_tower_900":
    case "island_hood_900":
      return { widthMm: 900, shape: "tower" };
    default:
      return { widthMm: 600, shape: "slide" };
  }
}

export const cooktopOptions = [
  { id: "none", name: "쿡탑/가스렌지 제외", price: 0, material: "가전 품목", color: "-" },
  { id: "gas_3burner_560", name: "3구 가스쿡탑 560", price: 180000, material: "가전 품목", color: "블랙" },
  { id: "induction_3zone_580", name: "3구 인덕션 580", price: 480000, material: "가전 품목", color: "블랙" },
  { id: "free_standing_range", name: "프리스탠딩 가스렌지 자리", price: 0, material: "가전 품목", color: "-" },
];

export const microwaveOptions = [
  { id: "none", name: "전자레인지장 제외", price: 0, material: "가전 품목", color: "-" },
  { id: "open_wall_600", name: "상부 오픈 전자레인지장 600", price: 65000, material: "가전 품목", color: "-" },
  { id: "tall_mw_600", name: "키큰 전자레인지장 600", price: 180000, material: "가전 품목", color: "-" },
];

export const drawerRailOptions = [
  { id: "drawer_3", name: "3단 서랍장 모듈", price: 85000, material: "부속 품목", color: "-" },
  { id: "pullout_2", name: "2단 인출식 레일장", price: 95000, material: "부속 품목", color: "-" },
];

export function getKitchenTemplate(templateId?: string) {
  return kitchenTemplates.find((template) => template.id === templateId) ?? kitchenTemplates[1];
}

function getOptionById<T extends { id: string }>(options: T[], optionId?: string) {
  return options.find((option) => option.id === optionId) ?? options[0];
}

export function getCountertopOption(optionId?: string) {
  return getOptionById(countertopOptions, optionId);
}

export function getToeKickOption(optionId?: string) {
  return getOptionById(toeKickOptions, optionId);
}

export function hasToeKickEnabled(optionId?: string) {
  return getToeKickOption(optionId).id !== "none";
}

export function getSinkOption(optionId?: string) {
  return getOptionById(sinkOptions, optionId);
}

/** 싱크볼이 들어가는 칸의 최소 폭(mm) — 검증(validateKitchenFixtures)·자동 확장·권장값 스냅이 모두 이 값을 쓴다(단일 진실). */
export function getSinkMinCabinetWidthMm(sinkOptionId?: string): number {
  if (!sinkOptionId || sinkOptionId === "none") return 0;
  if (sinkOptionId.includes("double")) return 950;
  if (sinkOptionId.includes("860")) return 900;
  return 800;
}

export function getFaucetOption(optionId?: string) {
  return getOptionById(faucetOptions, optionId);
}

export function getHoodOption(optionId?: string) {
  return getOptionById(hoodOptions, optionId);
}

export function getCooktopOption(optionId?: string) {
  return getOptionById(cooktopOptions, optionId);
}

export function getMicrowaveOption(optionId?: string) {
  return getOptionById(microwaveOptions, optionId);
}

export function clampModuleIndex(value: number, maxModuleIndex: number) {
  return Math.min(Math.max(0, Math.floor(value || 0)), Math.max(0, maxModuleIndex));
}

export function normalizeKitchenModules(
  template: KitchenTemplate,
  modules?: number[],
  moduleTypes?: KitchenModuleType[],
) {
  const fallbackModules = template.modules;
  const normalizedModules = (modules?.length ? modules : fallbackModules)
    .slice(0, MAX_KITCHEN_MODULE_COUNT)
    .map((moduleWidth) => snapKitchenModuleWidthMm(Number.isFinite(moduleWidth) ? Math.round(moduleWidth) : DEFAULT_KITCHEN_MODULE_WIDTH_MM));

  const finalModules = normalizedModules.length > 0 ? normalizedModules : [...fallbackModules];
  const normalizedTypes = finalModules.map((_, index) => moduleTypes?.[index] ?? "door");
  const totalWidth = finalModules.reduce((sum, width) => sum + width, 0);

  return {
    modules: finalModules,
    moduleTypes: normalizedTypes,
    width_mm: totalWidth,
  };
}

export function normalizeKitchenLayerWidths(baseModules: number[], layerModules?: number[]) {
  return baseModules.map((moduleWidth, index) => {
    const width = layerModules?.[index] ?? moduleWidth;
    return snapKitchenModuleWidthMm(Number.isFinite(width) ? Math.round(width) : moduleWidth);
  });
}

/** ㄱ자 측면 다리 모듈을 정규화한다. 빈 배열이면 그대로 반환(측면 없음). */
export function normalizeKitchenSideModules(modules?: number[], moduleTypes?: KitchenModuleType[]) {
  const list = (modules ?? [])
    .slice(0, MAX_KITCHEN_MODULE_COUNT)
    .map((moduleWidth) => snapKitchenModuleWidthMm(Number.isFinite(moduleWidth) ? Math.round(moduleWidth) : DEFAULT_KITCHEN_MODULE_WIDTH_MM));
  const types = list.map((_, index) => moduleTypes?.[index] ?? "door");
  return { modules: list, moduleTypes: types, width_mm: list.reduce((sum, width) => sum + width, 0) };
}

/** 입력이 ㄱ자이고 측면 모듈이 1칸 이상이면 true */
export function isLShapeKitchen(input: { kitchen_layout_shape?: "straight" | "l_shape"; kitchen_side_modules_mm?: number[] }) {
  return input.kitchen_layout_shape === "l_shape" && (input.kitchen_side_modules_mm?.length ?? 0) > 0;
}

export function deriveModuleTypeCounts(moduleTypes: KitchenModuleType[]) {
  const drawer = moduleTypes.filter((moduleType) => moduleType === "drawer").length;
  const pullout = moduleTypes.filter((moduleType) => moduleType === "pullout").length;
  const sink = moduleTypes.filter((moduleType) => moduleType === "sink_base").length;
  const cooktop = moduleTypes.filter((moduleType) => moduleType === "cooktop" || moduleType === "gas").length;
  const microwave = moduleTypes.filter((moduleType) => moduleType === "microwave" || moduleType === "oven" || moduleType === "dishwasher").length;
  return { drawer, pullout, sink, cooktop, microwave };
}

export function remapIndexByMove(index: number, from: number, to: number) {
  if (from === to) return index;
  if (index === from) return to;
  if (from < to) {
    if (index > from && index <= to) return index - 1;
    return index;
  }
  if (index >= to && index < from) return index + 1;
  return index;
}
