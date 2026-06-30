import { materials } from "@/lib/catalogData";
import { getActivePricingTier, type PricingTier } from "@/lib/pricingTier";
import { BOARD_STANDARDS } from "@/lib/platformConfig";
import type { BoardSheetSummary } from "@/lib/types";

export type BoardSheetSpec = {
  code: string;
  materialGroup: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  /** null이면 자재 m² 단가로 환산 */
  publicPricePerSheet: number | null;
  contractPricePerSheet: number | null;
};

/** ㅇ23ㅇ.docx + migration 0002 시드와 동기화 */
export const BOARD_SHEET_SPECS: BoardSheetSpec[] = [
  { code: "pb_1220x2440_18", materialGroup: "pb", widthMm: 1220, heightMm: 2440, thicknessMm: 18, publicPricePerSheet: 14600, contractPricePerSheet: 13200 },
  { code: "mdf_1220x2440_18", materialGroup: "mdf", widthMm: 1220, heightMm: 2440, thicknessMm: 18, publicPricePerSheet: 28000, contractPricePerSheet: 25200 },
  { code: "ply_1220x2440_12", materialGroup: "plywood", widthMm: 1220, heightMm: 2440, thicknessMm: 12, publicPricePerSheet: null, contractPricePerSheet: null },
  { code: "lpm_door_1220x2440_18", materialGroup: "lpm_door", widthMm: 1220, heightMm: 2440, thicknessMm: 18, publicPricePerSheet: null, contractPricePerSheet: null },
  { code: "pet_door_1220x2440_15", materialGroup: "pet_door", widthMm: 1220, heightMm: 2440, thicknessMm: 15, publicPricePerSheet: null, contractPricePerSheet: null },
];

const PRIMARY_SPEC = BOARD_SHEET_SPECS[0];

export function resolveMaterialGroup(materialName: string): string {
  if (/PET/i.test(materialName)) return "pet_door";
  if (/LPM/i.test(materialName)) return "lpm_door";
  if (/MDF/i.test(materialName)) return "mdf";
  if (/합판|plywood|ply/i.test(materialName)) return "plywood";
  return "pb";
}

export function getApplicableSheetSpecs(materialName: string): BoardSheetSpec[] {
  const group = resolveMaterialGroup(materialName);
  const matched = BOARD_SHEET_SPECS.filter((spec) => spec.materialGroup === group);
  return matched.length > 0 ? matched : [PRIMARY_SPEC];
}

export function getMaterialPricePerM2(materialName: string, tier: PricingTier = getActivePricingTier()) {
  const material = materials.find((candidate) => candidate.name === materialName);
  if (!material) return tier === "contract" ? 22500 : 25000;
  return tier === "contract" ? material.contract_price_per_m2 : material.price_per_m2;
}

export function getSheetUnitPrice(
  materialName: string,
  spec: BoardSheetSpec,
  tier: PricingTier = getActivePricingTier(),
): number {
  const sheetPrice =
    tier === "contract"
      ? (spec.contractPricePerSheet ?? spec.publicPricePerSheet)
      : spec.publicPricePerSheet;
  if (sheetPrice != null) return sheetPrice;
  const areaM2 = (spec.widthMm * spec.heightMm) / 1_000_000;
  return Math.round(getMaterialPricePerM2(materialName, tier) * areaM2);
}

export function calculateSummarySheetCost(summary: BoardSheetSummary, tier: PricingTier = getActivePricingTier()): number {
  const spec =
    BOARD_SHEET_SPECS.find((candidate) => candidate.code === summary.sheet_spec_code) ??
    BOARD_SHEET_SPECS.find(
      (candidate) => candidate.widthMm === summary.sheet_width_mm && candidate.heightMm === summary.sheet_height_mm,
    ) ??
    PRIMARY_SPEC;
  return summary.sheet_count * getSheetUnitPrice(summary.material, spec, tier);
}

export function getDefaultSheetSpec(materialName: string): BoardSheetSpec {
  return getApplicableSheetSpecs(materialName)[0] ?? PRIMARY_SPEC;
}

export function sheetAreaM2(spec: Pick<BoardSheetSpec, "widthMm" | "heightMm">) {
  return (spec.widthMm * spec.heightMm) / 1_000_000;
}

export function getUsableSheetBounds(
  spec: Pick<BoardSheetSpec, "widthMm" | "heightMm">,
  trim?: { widthMm: number; lengthMm: number },
) {
  const trimWidthMm = trim?.widthMm ?? BOARD_STANDARDS.trimWidthMm;
  const trimLengthMm = trim?.lengthMm ?? BOARD_STANDARDS.trimLengthMm;
  return {
    width_mm: spec.widthMm - trimWidthMm * 2,
    height_mm: spec.heightMm - trimLengthMm * 2,
  };
}
