// 제품별 주문 요구사항 정의 — 직접주문 허용 여부, 현장사진 필요 여부, 필수/조건부 필수 필드.

import type { ProductType } from "@/lib/types";

export type ConditionalRequirement = {
  when: { field: string; not?: string; gt?: number };
  fields: string[];
  reason: string;
};

export type ProductRequirement = {
  directOrderAllowed: boolean;
  requiresSitePhotos: boolean;
  requiredFields: string[];
  conditionalRequired?: ConditionalRequirement[];
};

const COMMON_REQUIRED = ["width_mm", "height_mm", "depth_mm", "material", "color"];

export const PRODUCT_REQUIREMENTS: Record<ProductType, ProductRequirement> = {
  desk: {
    directOrderAllowed: true,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED],
  },
  living_cabinet: {
    directOrderAllowed: true,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED, "shelf_count"],
  },
  custom_shelf: {
    directOrderAllowed: true,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED, "shelf_count"],
  },
  gap_cabinet: {
    directOrderAllowed: true,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED, "door_count", "shelf_count"],
  },
  shoe_cabinet: {
    directOrderAllowed: true,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED, "door_count", "shelf_count"],
  },
  kitchen_wall_cabinet: {
    directOrderAllowed: false,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED, "door_count"],
  },
  kitchen_island: {
    directOrderAllowed: true,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED],
  },
  kitchen_base_cabinet: {
    directOrderAllowed: false,
    requiresSitePhotos: false,
    requiredFields: [...COMMON_REQUIRED, "countertop_type"],
    // 배수/가스/콘센트 위치·타공은 현장 시공(시공기사) 몫 — 공장은 빠르게 재단·제작만 한다.
    // 싱크볼/쿡탑 모델은 옵션 선택(sink_option/cooktop_option)이 곧 모델이므로 별도 필수 없음.
    conditionalRequired: [],
  },
  kitchen_full_set: {
    directOrderAllowed: false,
    requiresSitePhotos: true,
    requiredFields: [...COMMON_REQUIRED, "countertop_type"],
    // 배수/가스/콘센트 위치·타공은 현장 시공(시공기사) 몫 — 공장은 빠르게 재단·제작만 한다.
    // 싱크볼/쿡탑 모델은 옵션 선택(sink_option/cooktop_option)이 곧 모델이므로 별도 필수 없음.
    conditionalRequired: [],
  },
  built_in_wardrobe: {
    directOrderAllowed: false,
    requiresSitePhotos: true,
    requiredFields: [...COMMON_REQUIRED, "door_count"],
  },
};
