import type { FurnitureInput, ProductType, Warning } from "@/lib/types";
import { ENTRANCE_STANDARDS, KITCHEN_STANDARDS, WARDROBE_STANDARDS } from "@/lib/platformConfig";

export type ProductRules = {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  minDepth: number;
  maxDepth: number;
  preferredDepthMm?: number;
  allowsDoorless: boolean;
  label: string;
};

export const productRules: Record<ProductType, ProductRules> = {
  desk: {
    label: "맞춤 책상",
    minWidth: 900,
    maxWidth: 2200,
    minHeight: 680,
    maxHeight: 1100,
    minDepth: 450,
    maxDepth: 900,
    preferredDepthMm: 600,
    allowsDoorless: true,
  },
  living_cabinet: {
    label: "거실 인테리어장",
    minWidth: 800,
    maxWidth: 3000,
    minHeight: 400,
    maxHeight: 2400,
    minDepth: 300,
    maxDepth: 600,
    preferredDepthMm: 400,
    allowsDoorless: true,
  },
  custom_shelf: {
    label: "맞춤 선반장",
    minWidth: 200,
    maxWidth: 1200,
    minHeight: 300,
    maxHeight: 2400,
    minDepth: 150,
    maxDepth: 600,
    allowsDoorless: true,
  },
  gap_cabinet: {
    label: "맞춤 틈새 수납장",
    minWidth: 200,
    maxWidth: 900,
    minHeight: 600,
    maxHeight: 2400,
    minDepth: 180,
    maxDepth: 600,
    allowsDoorless: true,
  },
  shoe_cabinet: {
    label: "맞춤 신발장",
    minWidth: 400,
    maxWidth: 1200,
    minHeight: ENTRANCE_STANDARDS.minTotalHeightMm,
    maxHeight: 2400,
    minDepth: ENTRANCE_STANDARDS.minDepthMm,
    maxDepth: 450,
    preferredDepthMm: ENTRANCE_STANDARDS.preferredDepthMm,
    allowsDoorless: false,
  },
  kitchen_base_cabinet: {
    label: "싱크대 하부장",
    minWidth: 300,
    maxWidth: 1200,
    minHeight: 800,
    maxHeight: KITCHEN_STANDARDS.baseHeightMm,
    minDepth: 550,
    maxDepth: 650,
    preferredDepthMm: KITCHEN_STANDARDS.baseDepthMm,
    allowsDoorless: false,
  },
  kitchen_island: {
    label: "아일랜드장",
    minWidth: 600,
    maxWidth: 2400,
    minHeight: 800,
    maxHeight: KITCHEN_STANDARDS.baseHeightMm,
    minDepth: 600,
    maxDepth: 900,
    preferredDepthMm: KITCHEN_STANDARDS.baseDepthMm,
    allowsDoorless: false,
  },
  kitchen_wall_cabinet: {
    label: "싱크대 상부장",
    minWidth: 300,
    maxWidth: 1200,
    minHeight: 500,
    maxHeight: 900,
    minDepth: 300,
    maxDepth: 450,
    preferredDepthMm: KITCHEN_STANDARDS.wallDepthMm,
    allowsDoorless: false,
  },
  kitchen_full_set: {
    label: "싱크대 상하부장 세트",
    minWidth: 1800,
    maxWidth: 3000,
    minHeight: 800,
    maxHeight: KITCHEN_STANDARDS.baseHeightMm,
    minDepth: 550,
    maxDepth: 650,
    preferredDepthMm: KITCHEN_STANDARDS.baseDepthMm,
    allowsDoorless: false,
  },
  built_in_wardrobe: {
    label: "붙박이장",
    minWidth: 600,
    maxWidth: 2400,
    minHeight: WARDROBE_STANDARDS.minTotalHeightMm,
    maxHeight: 2400,
    minDepth: WARDROBE_STANDARDS.minDepthMm,
    maxDepth: 650,
    preferredDepthMm: WARDROBE_STANDARDS.preferredDepthMm,
    allowsDoorless: false,
  },
};

export function getDoorCountOptions(productType: ProductType, widthMm: number, hasDoor: boolean) {
  if (!hasDoor && productRules[productType].allowsDoorless) return [0];
  if (widthMm < 250) return [];
  if (productType === "desk") return [];

  if (productType === "living_cabinet") {
    if (widthMm < 900) return [2];
    if (widthMm < 1500) return [2, 3];
    if (widthMm < 2100) return [3, 4];
    return [4, 5, 6];
  }

  if (productType === "gap_cabinet") {
    return widthMm < 600 ? [1] : [2];
  }

  if (productType === "shoe_cabinet") {
    if (widthMm < 600) return [1];
    if (widthMm < 900) return [2];
    return [3];
  }

  if (productType === "kitchen_base_cabinet") {
    if (widthMm < 450) return [1];
    if (widthMm < 900) return [2];
    if (widthMm < 1100) return [3];
    return [4];
  }

  if (productType === "kitchen_wall_cabinet") {
    if (widthMm < 600) return [1];
    if (widthMm < 900) return [2];
    return [3];
  }

  if (productType === "kitchen_full_set") {
    if (widthMm <= 1800) return [3];
    if (widthMm <= 2400) return [4];
    return [5];
  }

  if (productType === "built_in_wardrobe") {
    if (widthMm < 900) return [2];
    if (widthMm < 1500) return [3];
    if (widthMm < 2100) return [4];
    return [5, 6];
  }

  if (widthMm < 600) return [1];
  if (widthMm < 900) return [1, 2];
  return [2, 3];
}

export function getSafeDoorCount(productType: ProductType, widthMm: number, hasDoor: boolean, requestedDoorCount: number) {
  const options = getDoorCountOptions(productType, widthMm, hasDoor);
  if (options.length === 0) return Math.max(1, requestedDoorCount);
  if (options.includes(requestedDoorCount)) return requestedDoorCount;
  return options[0];
}

export function countOptionCases(input: FurnitureInput, materialCount: number, handleCount: number) {
  const doorOptions = getDoorCountOptions(input.productType, input.width_mm, input.has_door).length || 1;
  const doorPresenceCases = productRules[input.productType].allowsDoorless ? 2 : 1;
  return materialCount * handleCount * doorOptions * doorPresenceCases;
}

export function generateRuleWarnings(input: FurnitureInput): Warning[] {
  const rules = productRules[input.productType];
  const warnings: Warning[] = [];
  const doorOptions = getDoorCountOptions(input.productType, input.width_mm, input.has_door);

  if (input.width_mm < rules.minWidth || input.width_mm > rules.maxWidth) {
    warnings.push({ type: "error", message: `${rules.label} 가로는 ${rules.minWidth}mm 이상 ${rules.maxWidth}mm 이하만 가능합니다.` });
  }
  if (input.height_mm < rules.minHeight || input.height_mm > rules.maxHeight) {
    warnings.push({ type: "error", message: `${rules.label} 높이는 ${rules.minHeight}mm 이상 ${rules.maxHeight}mm 이하만 가능합니다.` });
  }
  if (input.depth_mm < rules.minDepth || input.depth_mm > rules.maxDepth) {
    warnings.push({ type: "error", message: `${rules.label} 깊이는 ${rules.minDepth}mm 이상 ${rules.maxDepth}mm 이하만 가능합니다.` });
  }
  if (rules.preferredDepthMm && Math.abs(input.depth_mm - rules.preferredDepthMm) > 50) {
    warnings.push({ type: "info", message: `${rules.label} 권장 깊이는 ${rules.preferredDepthMm}mm입니다.` });
  }
  if (input.productType === "shoe_cabinet" && input.height_mm < ENTRANCE_STANDARDS.minTotalHeightMm) {
    warnings.push({ type: "warning", message: `현관장 표준 최소 높이는 ${ENTRANCE_STANDARDS.minTotalHeightMm}mm입니다.` });
  }
  if (input.productType === "built_in_wardrobe" && input.height_mm < WARDROBE_STANDARDS.minTotalHeightMm) {
    warnings.push({ type: "warning", message: `붙박이장 표준 최소 높이는 ${WARDROBE_STANDARDS.minTotalHeightMm}mm입니다.` });
  }
  if (input.has_door && doorOptions.length === 0) {
    warnings.push({ type: "error", message: "현재 폭에서는 문짝 제작이 어렵습니다. 폭을 250mm 이상으로 조정해주세요." });
  }
  if (input.has_door && doorOptions.length > 0 && !doorOptions.includes(input.door_count)) {
    warnings.push({ type: "warning", message: `현재 폭에서는 문짝 ${doorOptions.join(", ")}개 조합만 권장됩니다.` });
  }
  if (!rules.allowsDoorless && !input.has_door) {
    warnings.push({ type: "warning", message: `${rules.label}은 기본적으로 문짝 포함 상품입니다.` });
  }

  return warnings;
}
