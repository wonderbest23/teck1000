import { BOARD_STANDARDS } from "@/lib/platformConfig";

export type CutStepCode = "trim" | "rip" | "crosscut" | "recut" | "label" | "edge";

export type FactoryProcessProfile = {
  factoryCode: string;
  label: string;
  kerfMm: number;
  trimWidthMm: number;
  trimLengthMm: number;
  cutSequence: CutStepCode[];
  packingRule: string;
  installHoursKitchen: number;
};

/** migration 0002 process_standards 시드와 동기화 — DB 로드 시 덮어씀 */
export let FACTORY_PROCESS_PROFILES: FactoryProcessProfile[] = [
  {
    factoryCode: "default",
    label: "기본 공장",
    kerfMm: 3,
    trimWidthMm: 10,
    trimLengthMm: 10,
    cutSequence: ["trim", "rip", "crosscut", "recut", "label", "edge"],
    packingRule: "골판지/비닐, 상판 PE필름 0.03mm 2겹",
    installHoursKitchen: 10,
  },
  {
    factoryCode: "precision",
    label: "정밀 재단 공장",
    kerfMm: 2.8,
    trimWidthMm: 8,
    trimLengthMm: 8,
    cutSequence: ["trim", "rip", "crosscut", "label", "edge"],
    packingRule: "코너 보호 + 수축필름, 상판 별도 박스",
    installHoursKitchen: 12,
  },
];

const FACTORY_LABELS: Record<string, string> = {
  default: "기본 공장",
  precision: "정밀 재단 공장",
};

export function applyProcessProfilesFromDb(
  rows: Array<{
    factory_code: string;
    kerf_mm: string | number;
    trim_width_mm: string | number;
    trim_length_mm: string | number;
    cut_sequence: string[];
    packing_rule: string | null;
    install_hours_kitchen: string | number | null;
  }>,
) {
  for (const row of rows) {
    const profile: FactoryProcessProfile = {
      factoryCode: row.factory_code,
      label: FACTORY_LABELS[row.factory_code] ?? row.factory_code,
      kerfMm: Number(row.kerf_mm),
      trimWidthMm: Number(row.trim_width_mm),
      trimLengthMm: Number(row.trim_length_mm),
      cutSequence: row.cut_sequence.filter((step): step is CutStepCode =>
        ["trim", "rip", "crosscut", "recut", "label", "edge"].includes(step),
      ),
      packingRule: row.packing_rule ?? "",
      installHoursKitchen: Number(row.install_hours_kitchen ?? 10),
    };
    const index = FACTORY_PROCESS_PROFILES.findIndex((candidate) => candidate.factoryCode === row.factory_code);
    if (index >= 0) FACTORY_PROCESS_PROFILES[index] = profile;
    else FACTORY_PROCESS_PROFILES.push(profile);
  }
}

export const CUT_STEP_LABELS: Record<CutStepCode, string> = {
  trim: "트림 정리",
  rip: "종재단 (Rip)",
  crosscut: "횡재단 (Crosscut)",
  recut: "재컷·사이즈 맞춤",
  label: "부품 라벨링",
  edge: "엣지 가공 대기",
};

let activeFactoryCode = "default";

export function getActiveFactoryCode() {
  return activeFactoryCode;
}

export function setActiveFactoryCode(factoryCode: string) {
  const profile = FACTORY_PROCESS_PROFILES.find((candidate) => candidate.factoryCode === factoryCode);
  if (profile) activeFactoryCode = profile.factoryCode;
  return getActiveProcessProfile();
}

export function getActiveProcessProfile(): FactoryProcessProfile {
  return FACTORY_PROCESS_PROFILES.find((profile) => profile.factoryCode === activeFactoryCode) ?? FACTORY_PROCESS_PROFILES[0];
}

export function getCuttingRuntimeConfig() {
  const profile = getActiveProcessProfile();
  return {
    sheetWidthMm: BOARD_STANDARDS.primaryWidthMm,
    sheetHeightMm: BOARD_STANDARDS.primaryHeightMm,
    kerfMm: profile.kerfMm,
    trimWidthMm: profile.trimWidthMm,
    trimLengthMm: profile.trimLengthMm,
    factoryCode: profile.factoryCode,
    factoryLabel: profile.label,
  };
}
