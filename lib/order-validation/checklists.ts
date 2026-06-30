import type { ProductType } from "@/lib/types";
import type { PreOrderChecklistItem } from "./types";

export const COMMON_PRE_ORDER_CHECKLIST: PreOrderChecklistItem[] = [
  { id: "confirm_dimensions", label: "입력한 가로·높이·깊이 치수를 확인했습니다.", required: true, category: "measurement" },
  { id: "confirm_custom_no_return", label: "맞춤 제작 특성상 제작 시작 후 단순 변심 취소/반품이 어렵다는 점을 확인했습니다.", required: true, category: "responsibility" },
  { id: "confirm_measurement_responsibility", label: "입력 치수 오류로 인한 재제작 비용은 주문자에게 발생할 수 있음을 확인했습니다.", required: true, category: "responsibility" },
];

const KITCHEN_CHECKLIST: PreOrderChecklistItem[] = [
  { id: "confirm_total_wall_length", label: "설치할 벽 전체 길이를 확인했습니다.", required: true, category: "measurement" },
  { id: "confirm_no_plumbing_work", label: "상수/배수/가스/전기 배관 공사는 포함되지 않음을 확인했습니다.", required: true, category: "installation" },
  { id: "confirm_review_before_production", label: "싱크볼·수전·쿡탑·가전 포함 주문은 제작 전 검수가 필요할 수 있음을 확인했습니다.", required: true, category: "responsibility" },
];

const WARDROBE_CHECKLIST: PreOrderChecklistItem[] = [
  { id: "confirm_room_levels", label: "좌·우 벽 높이와 바닥/천장 수평 상태를 확인했습니다. (검수 단계 확인 가능)", required: false, category: "measurement" },
  { id: "confirm_site_photos", label: "현장 실측/사진은 제작 확정 전 검수 단계에서 제공합니다.", required: false, category: "site" },
];

export function getChecklist(productType: ProductType): PreOrderChecklistItem[] {
  if (productType === "kitchen_base_cabinet" || productType === "kitchen_wall_cabinet" || productType === "kitchen_full_set") {
    return [...COMMON_PRE_ORDER_CHECKLIST, ...KITCHEN_CHECKLIST];
  }
  if (productType === "built_in_wardrobe") {
    return [...COMMON_PRE_ORDER_CHECKLIST, ...WARDROBE_CHECKLIST];
  }
  return COMMON_PRE_ORDER_CHECKLIST;
}
