import type { SourceMeta, ValueStatus } from "@/lib/interior/types";

export type SinkBowlMaster = {
  id: string;
  brand: string;
  model_code: string;
  install_type: string;
  overall_w_mm: number | null;
  overall_d_mm: number | null;
  overall_h_mm: number | null;
  bowl_w_mm: number | null;
  bowl_d_mm: number | null;
  cutout_w_mm: number | null;
  cutout_d_mm: number | null;
  cutout_radius_mm: number | null;
  drain_type: string | null;
  min_base_cabinet_width_mm: number | null;
  source_status: ValueStatus;
  source: SourceMeta;
  notes?: string;
};

/** PDF 예시 테이블 — 공개 확인값만 */
export const SINK_BOWL_MASTERS: SinkBowlMaster[] = [
  {
    id: "baekjo_reco85",
    brand: "백조씽크",
    model_code: "RECO85",
    install_type: "미등록",
    overall_w_mm: 850,
    overall_d_mm: 520,
    overall_h_mm: 230,
    bowl_w_mm: 780,
    bowl_d_mm: 400,
    cutout_w_mm: 822,
    cutout_d_mm: 487,
    cutout_radius_mm: 41,
    drain_type: "162",
    min_base_cabinet_width_mm: null,
    source_status: "미등록",
    source: {
      source_level: "manufacturer_product_page",
      source_name: "백조씽크 제품페이지",
      source_url: "https://baekjosink.com/product_list/reco85/",
      public_confirmed: true,
    },
    notes: "최소 하부장 폭 미공개 — 자동 승인 금지",
  },
  {
    id: "baekjo_sqsr780",
    brand: "백조씽크",
    model_code: "SQSR780-2",
    install_type: "인셋",
    overall_w_mm: 870,
    overall_d_mm: 450,
    overall_h_mm: 200,
    bowl_w_mm: 806,
    bowl_d_mm: 390,
    cutout_w_mm: 846,
    cutout_d_mm: 426,
    cutout_radius_mm: null,
    drain_type: "Ø162",
    min_base_cabinet_width_mm: null,
    source_status: "미등록",
    source: {
      source_level: "manufacturer_product_page",
      source_name: "백조씽크 제품페이지",
      source_url: "https://baekjosink.com/product_list/sqsr780-2/",
      public_confirmed: true,
    },
  },
  {
    id: "baekjo_elon_xl_8s",
    brand: "백조씽크",
    model_code: "ELON XL 8S",
    install_type: "인셋",
    overall_w_mm: 860,
    overall_d_mm: 500,
    overall_h_mm: 190,
    bowl_w_mm: 530,
    bowl_d_mm: 410,
    cutout_w_mm: 840,
    cutout_d_mm: 480,
    cutout_radius_mm: 15,
    drain_type: "89(SS)",
    min_base_cabinet_width_mm: null,
    source_status: "미등록",
    source: {
      source_level: "manufacturer_product_page",
      source_name: "백조씽크 제품페이지",
      source_url: "https://baekjosink.com/product_list/elon-xl-8s/",
      public_confirmed: true,
    },
  },
  {
    id: "baekjo_fox360",
    brand: "백조씽크",
    model_code: "FOX360",
    install_type: "인셋",
    overall_w_mm: 860,
    overall_d_mm: 500,
    overall_h_mm: 240,
    bowl_w_mm: 790,
    bowl_d_mm: 430,
    cutout_w_mm: 840,
    cutout_d_mm: 480,
    cutout_radius_mm: null,
    drain_type: "Ø89",
    min_base_cabinet_width_mm: null,
    source_status: "미등록",
    source: {
      source_level: "manufacturer_product_page",
      source_name: "백조씽크 제품페이지",
      source_url: "https://baekjosink.com/product_list/fox360/",
      public_confirmed: true,
    },
  },
  {
    id: "generic_single_780",
    brand: "플랫폼",
    model_code: "SINK-780-SINGLE",
    install_type: "인셋",
    overall_w_mm: 780,
    overall_d_mm: 450,
    overall_h_mm: 200,
    bowl_w_mm: 740,
    bowl_d_mm: 400,
    cutout_w_mm: null,
    cutout_d_mm: null,
    cutout_radius_mm: null,
    drain_type: null,
    min_base_cabinet_width_mm: null,
    source_status: "미등록",
    source: {
      source_level: "distributor_listing",
      source_name: "플랫폼 기본 매핑",
      public_confirmed: false,
      notes: "레거시 옵션 — 제조사 공식 스펙 연동 전",
    },
  },
];

/** kitchen.ts sink_option id → 마스터 */
export const SINK_OPTION_TO_MASTER: Record<string, string> = {
  none: "",
  single_780: "generic_single_780",
  single_860: "baekjo_fox360",
  double_900: "baekjo_reco85",
  baekjo_reco85: "baekjo_reco85",
  baekjo_elon_xl_8s: "baekjo_elon_xl_8s",
};

export function getSinkBowlMaster(masterId: string) {
  return SINK_BOWL_MASTERS.find((row) => row.id === masterId);
}

export function getSinkBowlByOptionId(optionId?: string) {
  const masterId = SINK_OPTION_TO_MASTER[optionId ?? ""] ?? "";
  if (!masterId) return null;
  return getSinkBowlMaster(masterId);
}
