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
    conditionalRequired: [
      {
        when: { field: "sink_option", not: "none" },
        fields: ["sink_model_id", "drain_position_x_mm"],
        reason: "싱크볼 선택 시 모델/배수 위치가 있어야 제작 가능합니다.",
      },
      {
        when: { field: "cooktop_option", not: "none" },
        fields: ["cooktop_model_id", "energy_type"],
        reason: "쿡탑 선택 시 모델/연료 종류가 있어야 타공·설치가 가능합니다.",
      },
    ],
  },
  kitchen_full_set: {
    directOrderAllowed: false,
    requiresSitePhotos: true,
    requiredFields: [...COMMON_REQUIRED, "countertop_type"],
    conditionalRequired: [
      {
        when: { field: "sink_option", not: "none" },
        fields: ["sink_model_id", "drain_position_x_mm"],
        reason: "싱크볼 선택 시 모델/배수 위치가 있어야 제작 가능합니다.",
      },
      {
        when: { field: "cooktop_option", not: "none" },
        fields: ["cooktop_model_id", "energy_type"],
        reason: "쿡탑 선택 시 모델/연료 종류가 있어야 타공·설치가 가능합니다.",
      },
    ],
  },
  built_in_wardrobe: {
    directOrderAllowed: false,
    requiresSitePhotos: true,
    requiredFields: [...COMMON_REQUIRED, "door_count"],
  },
};
