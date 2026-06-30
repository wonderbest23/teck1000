/** 파이프라인 기준서 — 공장 프로파일 (kerf/trim 미등록 시 재단 확정 불가) */

export type PlantProfile = {
  plant_id: string;
  plant_name: string;
  saw_kerf_mm: number | null;
  trim_margin_mm: number | null;
  cnc_hole_tolerance_mm: number | null;
  hinge_program_code: string;
  drawer_slide_program: string;
  toe_kick_profile_code: string;
  default_pack_rule: string;
  cut_finalization_allowed: boolean;
};

export const PLANT_PROFILES: PlantProfile[] = [
  {
    plant_id: "PLANT_DEFAULT",
    plant_name: "미등록 공장 프로파일",
    saw_kerf_mm: null,
    trim_margin_mm: null,
    cnc_hole_tolerance_mm: null,
    hinge_program_code: "미지정",
    drawer_slide_program: "미지정",
    toe_kick_profile_code: "미지정",
    default_pack_rule: "미지정",
    cut_finalization_allowed: false,
  },
  {
    plant_id: "PLANT_REGISTERED",
    plant_name: "등록 공장 (process_standards 연동)",
    saw_kerf_mm: 3,
    trim_margin_mm: 10,
    cnc_hole_tolerance_mm: 0.5,
    hinge_program_code: "DRILL-BASE-SIDE",
    drawer_slide_program: "SLIDE-450-30KG",
    toe_kick_profile_code: "TOE-150",
    default_pack_rule: "골판지/비닐, 상판 PE필름",
    cut_finalization_allowed: true,
  },
];

export function getPlantProfile(plantId?: string): PlantProfile {
  if (!plantId) {
    return PLANT_PROFILES.find((row) => row.plant_id === "PLANT_REGISTERED") ?? PLANT_PROFILES[1];
  }
  return PLANT_PROFILES.find((row) => row.plant_id === plantId) ?? PLANT_PROFILES[0];
}

export function isPlantProfileReadyForCut(profile: PlantProfile) {
  return profile.cut_finalization_allowed && profile.saw_kerf_mm != null && profile.trim_margin_mm != null;
}
