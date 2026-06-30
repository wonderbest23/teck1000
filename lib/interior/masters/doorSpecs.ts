import type { SourceMeta, ValueStatus } from "@/lib/interior/types";

export type DoorSpecMaster = {
  id: string;
  label: string;
  core_material: string;
  core_thickness_mm: number | null;
  face_material: string;
  back_material: string;
  field_cut_allowed: boolean;
  source_status: ValueStatus;
  source: SourceMeta;
};

/** PDF 문재질 마스터 최소 세트 */
export const DOOR_SPEC_MASTERS: DoorSpecMaster[] = [
  {
    id: "lpm_lpm_18",
    label: "LPM/LPM 18T PB",
    core_material: "PB",
    core_thickness_mm: 18,
    face_material: "LPM",
    back_material: "LPM",
    field_cut_allowed: true,
    source_status: "가능",
    source: { source_level: "manufacturer_catalog", source_name: "한샘 유로/밀란", public_confirmed: true },
  },
  {
    id: "pet_pet_18",
    label: "PET/PET 18T PB",
    core_material: "PB",
    core_thickness_mm: 18,
    face_material: "PET",
    back_material: "PET",
    field_cut_allowed: true,
    source_status: "가능",
    source: { source_level: "manufacturer_catalog", source_name: "LX Z:IN", public_confirmed: true },
  },
  {
    id: "pet_lpm_18",
    label: "PET/LPM 18T PB",
    core_material: "PB",
    core_thickness_mm: 18,
    face_material: "PET",
    back_material: "LPM",
    field_cut_allowed: true,
    source_status: "가능",
    source: { source_level: "manufacturer_catalog", source_name: "한샘 유로/밀란", public_confirmed: true },
  },
  {
    id: "veneer_coating",
    label: "무늬목+수성도료",
    core_material: "PB",
    core_thickness_mm: null,
    face_material: "veneer",
    back_material: "veneer",
    field_cut_allowed: false,
    source_status: "주의",
    source: { source_level: "manufacturer_product_page", source_name: "영림/한샘", public_confirmed: true, notes: "현장 가공 어려움" },
  },
  {
    id: "uv_coating",
    label: "UV 도장",
    core_material: "PB",
    core_thickness_mm: null,
    face_material: "paint_uv",
    back_material: "paint_uv",
    field_cut_allowed: true,
    source_status: "제작문의",
    source: { source_level: "manufacturer_catalog", source_name: "LX Z:IN", public_confirmed: false, notes: "브랜드별 두께 미등록" },
  },
];

const MATERIAL_TO_DOOR_SPEC: Record<string, string> = {
  "UV 하이그로시 화이트": "pet_pet_18",
  "UV 하이그로시 그레이": "pet_pet_18",
  "UV 하이그로시 차콜": "pet_pet_18",
  "무광 화이트": "pet_pet_18",
  "LPM 라이트오크": "lpm_lpm_18",
  "LPM 내추럴오크": "lpm_lpm_18",
  "LPM 월넛": "lpm_lpm_18",
  "LPM 자작": "lpm_lpm_18",
};

export function getDoorSpecForMaterial(materialName: string) {
  const id = MATERIAL_TO_DOOR_SPEC[materialName];
  if (!id) return null;
  return DOOR_SPEC_MASTERS.find((row) => row.id === id) ?? null;
}
