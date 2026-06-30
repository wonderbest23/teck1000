import { getPool } from "@/lib/db";
import { applyPlatformSettings, type PlatformSettingRow } from "@/lib/platformDb";
import { applyProcessProfilesFromDb, setActiveFactoryCode } from "@/lib/processStandards";
import { setActivePricingTier, type PricingTier } from "@/lib/pricingTier";

export type ProcessStandardRow = {
  factory_code: string;
  kerf_mm: string | number;
  trim_width_mm: string | number;
  trim_length_mm: string | number;
  cut_sequence: string[];
  packing_rule: string | null;
  install_hours_kitchen: string | number | null;
};

function parseJsonString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value != null && typeof value === "object") return JSON.stringify(value);
  return null;
}

function readSettingString(rows: PlatformSettingRow[], key: string) {
  const row = rows.find((candidate) => candidate.key === key);
  if (!row) return null;
  if (typeof row.value_json === "string") return row.value_json.replace(/^"|"$/g, "");
  if (typeof row.value_json === "number") return String(row.value_json);
  return parseJsonString(row.value_json)?.replace(/^"|"$/g, "") ?? null;
}

export async function fetchPlatformSettings(): Promise<PlatformSettingRow[]> {
  const { rows } = await getPool().query<PlatformSettingRow>(
    "select key, value_json, label from platform_settings order by key",
  );
  return rows;
}

export async function fetchProcessStandards(): Promise<ProcessStandardRow[]> {
  const { rows } = await getPool().query<ProcessStandardRow>(
    "select factory_code, kerf_mm, trim_width_mm, trim_length_mm, cut_sequence, packing_rule, install_hours_kitchen from process_standards where is_active = true order by factory_code",
  );
  return rows;
}

export async function updatePlatformPreference(key: string, value: string | number) {
  await getPool().query(
    `insert into platform_settings (key, value_json, label)
     values ($1, to_jsonb($2::text), $3)
     on conflict (key) do update set value_json = to_jsonb($2::text), updated_at = now()`,
    [key, String(value), key],
  );
}

export async function hydratePlatformFromDatabase() {
  const settings = await fetchPlatformSettings();
  const processStandards = await fetchProcessStandards();

  applyPlatformSettings(settings);
  applyProcessProfilesFromDb(processStandards);

  const factoryCode = readSettingString(settings, "factory.active_code");
  if (factoryCode) setActiveFactoryCode(factoryCode);

  const pricingTier = readSettingString(settings, "pricing.active_tier");
  if (pricingTier === "public" || pricingTier === "contract") {
    setActivePricingTier(pricingTier);
  }

  return {
    settings,
    processStandards,
    factoryCode: factoryCode ?? "default",
    pricingTier: (pricingTier as PricingTier | null) ?? "public",
    databaseConnected: true,
  };
}

export async function savePlatformPreferences(input: { factoryCode: string; pricingTier: PricingTier }) {
  await updatePlatformPreference("factory.active_code", input.factoryCode);
  await updatePlatformPreference("pricing.active_tier", input.pricingTier);
  setActiveFactoryCode(input.factoryCode);
  setActivePricingTier(input.pricingTier);
  return hydratePlatformFromDatabase();
}
