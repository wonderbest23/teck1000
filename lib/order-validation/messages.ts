// 필드 식별자 → 사용자용 한글 라벨.
export const FIELD_LABELS: Record<string, string> = {
  width_mm: "가로",
  height_mm: "높이",
  depth_mm: "깊이",
  material: "소재",
  color: "색상",
  door_count: "문짝 수",
  shelf_count: "선반/칸 수",
  countertop_type: "상판",
  sink_model_id: "싱크볼 모델",
  drain_position_x_mm: "배수 위치(좌측벽 기준 mm)",
  cooktop_model_id: "쿡탑 모델",
  energy_type: "쿡탑 연료(가스/인덕션)",
  hood_position_x_mm: "후드 위치(mm)",
  leg_option: "다리(레그) 옵션",
  toe_kick_option: "걸레받이",
  site_photos: "현장 사진",
};

export function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field;
}
