import type { DoorStyle, MaterialColors, MaterialPreset } from "@/components/preview3d/types";

// 한국 싱크대/가구 실제 마감 — UV 하이그로시(고광택), 무광(슈퍼매트), LPM 무늬목(우드 텍스쳐, CC0)
export const materialPresets: Record<MaterialPreset, MaterialColors> = {
  white_pb: { label: "UV 하이그로시 화이트", color: "#fbfcfe", edge: "#e2e8f0", accent: "#cbd5e1", finish: "gloss" },
  gray_pb: { label: "UV 하이그로시 그레이", color: "#8f969d", edge: "#5b636b", accent: "#454c54", finish: "gloss" },
  black_lpm: { label: "UV 하이그로시 차콜", color: "#2f343a", edge: "#15181c", accent: "#3f464e", finish: "gloss" },
  matte_white_pet: { label: "무광 화이트(슈퍼매트)", color: "#f2f3f5", edge: "#d1d5db", accent: "#e5e7eb", finish: "matte" },
  oak_pb: { label: "LPM 라이트오크", color: "#cba571", edge: "#8a5a2b", accent: "#7c4a1d", finish: "wood", texture: "/textures/lightoak.jpg" },
  natural_mdf: { label: "LPM 내추럴오크", color: "#bd9568", edge: "#7a4f2a", accent: "#8b5e34", finish: "wood", texture: "/textures/oak.jpg" },
  walnut_plywood: { label: "LPM 월넛", color: "#7a513a", edge: "#3f2417", accent: "#24130d", finish: "wood", texture: "/textures/walnut.jpg" },
  birch_plywood: { label: "LPM 자작", color: "#d8be93", edge: "#9a6b35", accent: "#7a4b20", finish: "wood", texture: "/textures/birch.jpg" },
};

export const doorStyleLabels: Record<DoorStyle, string> = {
  flat: "민자 문짝",
  frame: "프레임 문짝",
  slat: "템바/루버 문짝",
};

export function lighten(color: string) {
  if (color === "#fbfcfe") return "#ffffff";
  if (color === "#8f969d") return "#c0c6cc";
  if (color === "#7a513a") return "#8c5f44";
  if (color === "#2f343a") return "#454c54";
  if (color === "#f2f3f5") return "#ffffff";
  return "#d2a66d";
}

export function getMaterialPreset(material: string): MaterialPreset {
  if (material.includes("차콜") || material.includes("블랙")) return "black_lpm";
  if (material.includes("그레이")) return "gray_pb";
  if (material.includes("월넛")) return "walnut_plywood";
  if (material.includes("자작")) return "birch_plywood";
  if (material.includes("내추럴")) return "natural_mdf";
  if (material.includes("오크")) return "oak_pb";
  if (material.includes("무광")) return "matte_white_pet";
  return "white_pb";
}
