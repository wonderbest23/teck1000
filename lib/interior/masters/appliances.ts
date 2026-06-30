import type { SourceMeta, ValueStatus } from "@/lib/interior/types";

export type ApplianceMaster = {
  appliance_id: string;
  category: "dishwasher" | "oven" | "microwave" | "hood" | "cooktop";
  brand: string;
  model_code: string;
  product_width_mm: number | null;
  product_height_mm: number | null;
  product_depth_mm: number | null;
  opening_width_min_mm: number | null;
  opening_width_max_mm: number | null;
  opening_height_min_mm: number | null;
  opening_height_max_mm: number | null;
  opening_depth_min_mm: number | null;
  toe_kick_height_min_mm: number | null;
  toe_kick_height_max_mm: number | null;
  leg_adjust_max_mm: number | null;
  door_open_clearance_mm: number | null;
  water_required: boolean;
  drain_required: boolean;
  power_required: boolean;
  source_status: ValueStatus;
  source: SourceMeta;
};

/** 파이프라인 기준서 PDF — LG·삼성 공개 설치가이드 */
export const APPLIANCE_MASTERS: ApplianceMaster[] = [
  {
    appliance_id: "DW_LG_BUILTIN_FAMILY_150",
    category: "dishwasher",
    brand: "LG",
    model_code: "DU*/DUB* family",
    product_width_mm: 598,
    product_height_mm: 815,
    product_depth_mm: 567,
    opening_width_min_mm: 598,
    opening_width_max_mm: 605,
    opening_height_min_mm: 815,
    opening_height_max_mm: 880,
    opening_depth_min_mm: 532,
    toe_kick_height_min_mm: 121,
    toe_kick_height_max_mm: 150,
    leg_adjust_max_mm: 60,
    door_open_clearance_mm: 590,
    water_required: true,
    drain_required: true,
    power_required: true,
    source_status: "가능",
    source: {
      source_level: "manufacturer_catalog",
      source_name: "LG 식기세척기 설치가이드",
      public_confirmed: true,
    },
  },
  {
    appliance_id: "DW_SAMSUNG_DW60J",
    category: "dishwasher",
    brand: "Samsung",
    model_code: "DW60J*",
    product_width_mm: null,
    product_height_mm: null,
    product_depth_mm: null,
    opening_width_min_mm: 600,
    opening_width_max_mm: null,
    opening_height_min_mm: 820,
    opening_height_max_mm: null,
    opening_depth_min_mm: 575,
    toe_kick_height_min_mm: null,
    toe_kick_height_max_mm: null,
    leg_adjust_max_mm: null,
    door_open_clearance_mm: null,
    water_required: true,
    drain_required: true,
    power_required: true,
    source_status: "가능",
    source: {
      source_level: "manufacturer_catalog",
      source_name: "삼성전자서비스 설치공간 확인",
      public_confirmed: true,
    },
  },
  {
    appliance_id: "OVEN_LG_MZ941CLCAT",
    category: "oven",
    brand: "LG",
    model_code: "MZ941CLCAT",
    product_width_mm: 595,
    product_height_mm: 459,
    product_depth_mm: 469,
    opening_width_min_mm: 564,
    opening_width_max_mm: null,
    opening_height_min_mm: null,
    opening_height_max_mm: null,
    opening_depth_min_mm: 550,
    toe_kick_height_min_mm: null,
    toe_kick_height_max_mm: null,
    leg_adjust_max_mm: null,
    door_open_clearance_mm: null,
    water_required: false,
    drain_required: false,
    power_required: true,
    source_status: "가능",
    source: {
      source_level: "manufacturer_catalog",
      source_name: "LG B2B 빌트인 광파오븐",
      public_confirmed: true,
    },
  },
];

export function getApplianceMaster(applianceId: string) {
  return APPLIANCE_MASTERS.find((row) => row.appliance_id === applianceId);
}
