// 붙박이장 모듈 구성 — 주방 세트처럼 행거장/선반장/서랍장 모듈을 옆으로 이어 붙이는 구조.

export type WardrobeModuleType = "hang" | "hang2" | "shelf" | "drawer";

export const wardrobeModuleTypeLabels: Record<WardrobeModuleType, string> = {
  hang: "행거장",
  hang2: "2단 행거",
  shelf: "선반장",
  drawer: "서랍장",
};

export const DEFAULT_WARDROBE_MODULE_WIDTH_MM = 600;
export const MIN_WARDROBE_MODULE_WIDTH_MM = 400;
export const MAX_WARDROBE_MODULE_WIDTH_MM = 1000;
export const MIN_WARDROBE_MODULE_COUNT = 1;
export const MAX_WARDROBE_MODULE_COUNT = 8;

// 서랍 현실 기준 — 서랍은 손이 닿는 하부 구역에만, 각 서랍 180~260mm.
// (전신 높이 붙박이장에 2.1m짜리 4단 서랍은 비현실적이므로 하부 구역으로 제한)
export const WARDROBE_DRAWER_ZONE_MAX_MM = 1000;
export const WARDROBE_DRAWER_MIN_HEIGHT_MM = 180;

/** 서랍이 들어가는 하부 구역 높이(손이 닿는 범위). 모듈 높이의 절반과 1000mm 중 작은 값. */
export function getWardrobeDrawerZoneMm(moduleHeightMm: number) {
  const h = Number.isFinite(moduleHeightMm) && moduleHeightMm > 0 ? moduleHeightMm : 2100;
  return Math.max(360, Math.min(WARDROBE_DRAWER_ZONE_MAX_MM, Math.round(h * 0.5)));
}

/** 모듈 높이 기준 현실적인 서랍 단수 한계 (각 서랍 약 180~250mm). */
export function getWardrobeDrawerCountLimits(moduleHeightMm: number) {
  const zoneMm = getWardrobeDrawerZoneMm(moduleHeightMm);
  const max = Math.max(2, Math.min(5, Math.floor(zoneMm / WARDROBE_DRAWER_MIN_HEIGHT_MM)));
  return { min: 2, max, zoneMm };
}

export type WardrobeLayout = {
  modules: number[];
  moduleTypes: WardrobeModuleType[];
  width_mm: number;
};

export function snapWardrobeModuleWidthMm(widthMm: number) {
  const value = Number.isFinite(widthMm) ? widthMm : DEFAULT_WARDROBE_MODULE_WIDTH_MM;
  const snapped = Math.round(value / 10) * 10;
  return Math.min(MAX_WARDROBE_MODULE_WIDTH_MM, Math.max(MIN_WARDROBE_MODULE_WIDTH_MM, snapped));
}

/** 실제 붙박이장 기본 칸 구성: 서랍장 → 행거장 → 선반장 순환 */
function defaultTypeForIndex(index: number): WardrobeModuleType {
  const pattern: WardrobeModuleType[] = ["hang", "drawer", "shelf", "hang"];
  return pattern[index % pattern.length];
}

/** 전체 폭을 600mm 안팎의 모듈로 균등 분할 */
export function getDefaultWardrobeModules(totalWidthMm: number): { modules: number[]; moduleTypes: WardrobeModuleType[] } {
  const safeTotal = Math.max(MIN_WARDROBE_MODULE_WIDTH_MM, Math.round(totalWidthMm || 1800));
  const count = Math.min(
    MAX_WARDROBE_MODULE_COUNT,
    Math.max(MIN_WARDROBE_MODULE_COUNT, Math.round(safeTotal / DEFAULT_WARDROBE_MODULE_WIDTH_MM)),
  );
  const modules = distributeWardrobeWidth(safeTotal, count);
  const moduleTypes = modules.map((_, index) => defaultTypeForIndex(index));
  return { modules, moduleTypes };
}

/** 총 폭을 모듈 개수만큼 10mm 단위로 균등 분배 (모듈 폭 한계 내) */
export function distributeWardrobeWidth(totalWidthMm: number, moduleCount: number): number[] {
  const count = Math.min(MAX_WARDROBE_MODULE_COUNT, Math.max(MIN_WARDROBE_MODULE_COUNT, Math.round(moduleCount)));
  const minTotal = MIN_WARDROBE_MODULE_WIDTH_MM * count;
  const maxTotal = MAX_WARDROBE_MODULE_WIDTH_MM * count;
  const safeTotal = Math.min(maxTotal, Math.max(minTotal, Math.round(totalWidthMm)));
  const base = Math.floor(safeTotal / count / 10) * 10;
  const modules = Array.from({ length: count }, () => base);
  let remaining = safeTotal - base * count;
  for (let index = modules.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const add = Math.min(remaining, 10);
    modules[index] += add;
    remaining -= add;
  }
  return modules.map((width) => snapWardrobeModuleWidthMm(width));
}

/** 입력값을 정규화해 모듈/타입 배열을 정렬·보정 */
export function normalizeWardrobeModules(
  modulesMm: number[] | undefined,
  moduleTypes: WardrobeModuleType[] | undefined,
  fallbackWidthMm = 1800,
): WardrobeLayout {
  let modules = (modulesMm && modulesMm.length ? modulesMm : getDefaultWardrobeModules(fallbackWidthMm).modules).map((width) =>
    snapWardrobeModuleWidthMm(width),
  );
  if (modules.length < MIN_WARDROBE_MODULE_COUNT) {
    modules = getDefaultWardrobeModules(fallbackWidthMm).modules;
  }
  if (modules.length > MAX_WARDROBE_MODULE_COUNT) {
    modules = modules.slice(0, MAX_WARDROBE_MODULE_COUNT);
  }
  // 가로(전체 폭)를 직접 바꾼 경우: 모듈을 비례 스케일해 목표 폭에 맞춘다(칸 단위 min/max 안에서).
  const currentSum = modules.reduce((sum, width) => sum + width, 0);
  if (fallbackWidthMm > 0 && currentSum > 0 && Math.abs(fallbackWidthMm - currentSum) > 5) {
    const factor = fallbackWidthMm / currentSum;
    modules = modules.map((width) => snapWardrobeModuleWidthMm(width * factor));
  }
  const wardrobeModuleTypes = modules.map((_, index) => moduleTypes?.[index] ?? defaultTypeForIndex(index));
  const width_mm = modules.reduce((sum, width) => sum + width, 0);
  return { modules, moduleTypes: wardrobeModuleTypes, width_mm };
}

/** 모듈 개수에 맞춰 카운트 배열을 정렬 (선반/서랍 단수 등) */
export function alignWardrobeCounts(
  counts: number[] | undefined,
  length: number,
  fallback: number,
  min: number,
  max: number,
): number[] {
  return Array.from({ length }, (_, index) =>
    Math.min(max, Math.max(min, Math.round(counts?.[index] ?? fallback))),
  );
}
