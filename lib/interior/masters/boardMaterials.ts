/** 파이프라인 기준서 — 동화기업 공개 보드 규격 */

export type BoardMaterialMaster = {
  board_id: string;
  board_family: "PLYWOOD" | "PB" | "MDF" | "DESIGN_BOARD";
  core_material: string;
  sheet_width_mm: number;
  sheet_length_mm: number;
  thickness_mm: number;
  formaldehyde_grade: string;
  water_resistance_grade: string;
  bending_grade: string;
  manufacturer: string;
  source_id: string;
};

export const BOARD_MATERIAL_MASTERS: BoardMaterialMaster[] = [
  {
    board_id: "DW_MDF_18_1220x2440",
    board_family: "MDF",
    core_material: "fiberboard",
    sheet_width_mm: 1220,
    sheet_length_mm: 2440,
    thickness_mm: 18,
    formaldehyde_grade: "E0",
    water_resistance_grade: "미지정",
    bending_grade: "35형",
    manufacturer: "Dongwha",
    source_id: "SRC-DONGWHA-ECOBOARD",
  },
  {
    board_id: "DW_PB_18_1220x2440",
    board_family: "PB",
    core_material: "particleboard",
    sheet_width_mm: 1220,
    sheet_length_mm: 2440,
    thickness_mm: 18,
    formaldehyde_grade: "E0",
    water_resistance_grade: "미지정",
    bending_grade: "15형",
    manufacturer: "Dongwha",
    source_id: "SRC-DONGWHA-ECOBOARD",
  },
  {
    board_id: "DW_PLY_12_1220x2440",
    board_family: "PLYWOOD",
    core_material: "plywood",
    sheet_width_mm: 1220,
    sheet_length_mm: 2440,
    thickness_mm: 12,
    formaldehyde_grade: "E0",
    water_resistance_grade: "준내수1급",
    bending_grade: "미지정",
    manufacturer: "국립산림과학원 고시",
    source_id: "SRC-FOREST-PLY",
  },
];

export function getBoardMaterial(boardId: string) {
  return BOARD_MATERIAL_MASTERS.find((row) => row.board_id === boardId);
}
