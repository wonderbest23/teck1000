import type { SourceMeta, ValueStatus } from "@/lib/interior/types";

export type FaucetMaster = {
  id: string;
  brand: string;
  model_code: string;
  installation_type: string;
  total_height_mm: number | null;
  body_diameter_mm: number | null;
  mount_hole_recommended_mm: string | null;
  hose_length_mm: number | null;
  pull_out_supported: boolean | null;
  recommended_rear_clearance_mm: number | null;
  source_status: ValueStatus;
  source: SourceMeta;
};

export const FAUCET_MASTERS: FaucetMaster[] = [
  {
    id: "generic_basic_cobra",
    brand: "플랫폼",
    model_code: "BASIC-COBRA",
    installation_type: "deck",
    total_height_mm: null,
    body_diameter_mm: null,
    mount_hole_recommended_mm: "Ø33~38",
    hose_length_mm: null,
    pull_out_supported: false,
    recommended_rear_clearance_mm: null,
    source_status: "미등록",
    source: {
      source_level: "distributor_listing",
      source_name: "플랫폼 기본",
      public_confirmed: false,
    },
  },
  {
    id: "generic_pullout",
    brand: "플랫폼",
    model_code: "PULLOUT",
    installation_type: "deck",
    total_height_mm: null,
    body_diameter_mm: null,
    mount_hole_recommended_mm: "Ø33~38",
    hose_length_mm: null,
    pull_out_supported: true,
    recommended_rear_clearance_mm: null,
    source_status: "미등록",
    source: {
      source_level: "distributor_listing",
      source_name: "플랫폼 기본",
      public_confirmed: false,
      notes: "호스 길이 미등록 — 제작문의",
    },
  },
];

export const FAUCET_OPTION_TO_MASTER: Record<string, string> = {
  none: "",
  basic_cobra: "generic_basic_cobra",
  pullout: "generic_pullout",
  black_pullout: "generic_pullout",
};

export function getFaucetByOptionId(optionId?: string) {
  const masterId = FAUCET_OPTION_TO_MASTER[optionId ?? ""] ?? "";
  if (!masterId) return null;
  return FAUCET_MASTERS.find((row) => row.id === masterId) ?? null;
}
