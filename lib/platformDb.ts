/**
 * Phase 3: platform_settings → platformConfig 하이드레이션
 * Supabase 클라이언트 연동 전까지는 서버/관리자에서 수동 호출.
 */
import {
  BOARD_STANDARDS,
  type PlatformQuoteConfig,
  setQuoteConfigOverride,
} from "@/lib/platformConfig";

export type PlatformSettingRow = {
  key: string;
  value_json: unknown;
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** DB `platform_settings` 행 배열을 견적·재단 기본값에 반영 */
export function applyPlatformSettings(rows: PlatformSettingRow[]) {
  const quotePatch: Record<string, number> = {};

  for (const row of rows) {
    const n = asNumber(row.value_json);
    if (n === undefined) continue;

    switch (row.key) {
      case "quote.margin_rate":
        quotePatch.marginRate = n;
        break;
      case "quote.edge_price_per_m":
        quotePatch.edgePricePerM = n;
        break;
      case "quote.cutting_price_per_job":
        quotePatch.cuttingPricePerJob = n;
        break;
      case "quote.assembly_price_per_set":
        quotePatch.assemblyPricePerSet = n;
        break;
      case "quote.delivery_price":
        quotePatch.deliveryPrice = n;
        break;
      default:
        break;
    }
  }

  if (Object.keys(quotePatch).length > 0) {
    setQuoteConfigOverride(quotePatch as Partial<PlatformQuoteConfig>);
  }

  return {
    quote: quotePatch,
    board: {
      kerfMm: asNumber(rows.find((r) => r.key === "board.kerf_mm")?.value_json) ?? BOARD_STANDARDS.kerfMm,
      trimWidthMm: asNumber(rows.find((r) => r.key === "board.trim_width_mm")?.value_json) ?? BOARD_STANDARDS.trimWidthMm,
      trimLengthMm: asNumber(rows.find((r) => r.key === "board.trim_length_mm")?.value_json) ?? BOARD_STANDARDS.trimLengthMm,
    },
  };
}
