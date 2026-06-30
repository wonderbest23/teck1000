import { BOARD_MATERIAL_MASTERS } from "@/lib/interior/masters/boardMaterials";
import { getPlantProfile, isPlantProfileReadyForCut } from "@/lib/interior/masters/plantProfiles";
import { getSinkBowlByOptionId } from "@/lib/interior/masters/sinkBowls";
import type { ApplianceSlot } from "@/lib/interior/pipeline/types";
import type { Part } from "@/lib/types";

export type BomSourceStatus = "공개확인" | "일부" | "미지정";

export type BomLineItem = {
  order_item_id: string;
  category: "board" | "module" | "sink" | "appliance" | "edge" | "plant_profile";
  code: string;
  spec: string;
  quantity: number;
  key_specs: string;
  source_status: BomSourceStatus;
};

export type CutPlanDerivedFrom = "module_formula" | "plant_profile" | "tech_ref";

export type CutPlanLine = {
  cut_id: string;
  part_code: string;
  parent_module: string;
  material: string;
  raw_w_mm: number | "미지정";
  raw_l_mm: number | "미지정";
  edge: string;
  drill_program: string;
  derived_from: CutPlanDerivedFrom;
};

export type PackingLabelField = {
  work_order_no: string;
  room_zone: string;
  run_id: string;
  module_id: string;
  carton_seq: number;
  install_order: number;
  fragile_flag: boolean;
  site_review_flag: boolean;
};

export function buildBomLines(input: {
  productType: string;
  sink_option?: string;
  appliances?: ApplianceSlot[];
  plant_id?: string;
  sheet_count?: number;
}): BomLineItem[] {
  const lines: BomLineItem[] = [];
  let seq = 1;

  const nextId = () => `OI-${String(seq++).padStart(3, "0")}`;

  for (const board of BOARD_MATERIAL_MASTERS.filter((row) => row.board_family === "PB" || row.board_family === "MDF").slice(0, 2)) {
    lines.push({
      order_item_id: nextId(),
      category: "board",
      code: board.board_id,
      spec: `${board.board_family} ${board.thickness_mm}T ${board.sheet_width_mm}×${board.sheet_length_mm}`,
      quantity: input.sheet_count ?? 1,
      key_specs: `${board.formaldehyde_grade}, ${board.bending_grade}`,
      source_status: "공개확인",
    });
  }

  if (input.sink_option && input.sink_option !== "none") {
    const sink = getSinkBowlByOptionId(input.sink_option);
    lines.push({
      order_item_id: nextId(),
      category: "sink",
      code: sink?.model_code ?? input.sink_option,
      spec: sink?.overall_w_mm ? `${sink.overall_w_mm}×${sink.overall_d_mm}×${sink.overall_h_mm}` : "미지정",
      quantity: 1,
      key_specs: sink?.cutout_w_mm ? `컷아웃 ${sink.cutout_w_mm}×${sink.cutout_d_mm}` : "드레인 중심 미지정",
      source_status: sink?.cutout_w_mm ? "일부" : "미지정",
    });
  }

  for (const slot of input.appliances ?? []) {
    lines.push({
      order_item_id: nextId(),
      category: "appliance",
      code: slot.appliance_id,
      spec: slot.category,
      quantity: 1,
      key_specs:
        slot.opening_width_mm != null
          ? `개구부 ${slot.opening_width_mm}×${slot.opening_height_mm ?? "?"}×${slot.opening_depth_mm ?? "?"}`
          : "개구부 미지정",
      source_status: slot.opening_width_mm != null ? "공개확인" : "미지정",
    });
  }

  lines.push({
    order_item_id: nextId(),
    category: "edge",
    code: "EDGE_ABS_WHITE",
    spec: "ABS",
    quantity: 1,
    key_specs: "두께 미지정",
    source_status: "미지정",
  });

  const plant = getPlantProfile(input.plant_id);
  lines.push({
    order_item_id: nextId(),
    category: "plant_profile",
    code: plant.plant_id,
    spec: "saw/cnc/pack",
    quantity: 1,
    key_specs: isPlantProfileReadyForCut(plant) ? `kerf ${plant.saw_kerf_mm}mm` : "kerf 미지정",
    source_status: isPlantProfileReadyForCut(plant) ? "공개확인" : "미지정",
  });

  return lines;
}

export function buildCutPlanLines(parts: Part[], parentModule: string, plantId?: string): CutPlanLine[] {
  const plant = getPlantProfile(plantId);
  const canFinalize = isPlantProfileReadyForCut(plant);
  let cutSeq = 1;

  return parts.slice(0, 8).map((part) => {
    const cutId = `CUT-${String(cutSeq++).padStart(3, "0")}`;
    const isCountertop = /상판|countertop/i.test(part.name);
    const isSinkCutout = /싱크|sink/i.test(part.name);

    if (isCountertop || isSinkCutout) {
      return {
        cut_id: cutId,
        part_code: part.name,
        parent_module: parentModule,
        material: part.material,
        raw_w_mm: "미지정",
        raw_l_mm: "미지정",
        edge: "none",
        drill_program: isSinkCutout ? "CNC-SINK-CUTOUT" : "DRILL-NONE",
        derived_from: "tech_ref" as const,
      };
    }

    return {
      cut_id: cutId,
      part_code: part.name,
      parent_module: parentModule,
      material: part.material,
      raw_w_mm: canFinalize ? part.width_mm : "미지정",
      raw_l_mm: canFinalize ? part.height_mm : "미지정",
      edge: /문짝|도어/i.test(part.name) ? "F/N/N/B" : "F/F/F/F",
      drill_program: /측판|SIDE/i.test(part.name) ? "DRILL-BASE-SIDE" : "DRILL-NONE",
      derived_from: canFinalize ? ("plant_profile" as const) : ("tech_ref" as const),
    };
  });
}

export function buildPackingLabel(orderNumber: string, siteReview: boolean): PackingLabelField {
  return {
    work_order_no: orderNumber,
    room_zone: "kitchen",
    run_id: "run_A",
    module_id: "MILAN-DRAWER-600",
    carton_seq: 1,
    install_order: 1,
    fragile_flag: true,
    site_review_flag: siteReview,
  };
}
