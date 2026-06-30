import type { ProductType } from "@/lib/types";

/** 에디터 좌측 레일에 표시되는 카테고리 한 칸 */
export type EditorCategory = {
  id: "material" | "spec" | "modules" | "fixtures" | "doors" | "build" | "addproduct" | "check";
  label: string;
  icon: string;
};

const MATERIAL: EditorCategory = { id: "material", label: "소재", icon: "🎨" };
const SPEC: EditorCategory = { id: "spec", label: "규격·사이즈", icon: "📐" };
const MODULES: EditorCategory = { id: "modules", label: "칸 편집", icon: "🧩" };
const FIXTURES: EditorCategory = { id: "fixtures", label: "주방 설비", icon: "🚰" };
const DOORS: EditorCategory = { id: "doors", label: "문·부속", icon: "🚪" };
const BUILD: EditorCategory = { id: "build", label: "제작사양", icon: "🏭" };
const ADDPRODUCT: EditorCategory = { id: "addproduct", label: "상품추가", icon: "🛒" };
const CHECK: EditorCategory = { id: "check", label: "검수·주문", icon: "✅" };

/**
 * 제품별 에디터 카테고리 구성 (단일 소스).
 * 칸 편집(modules)은 모듈형(상하부 세트·붙박이장)에서만, 주방 설비(fixtures)는 주방에서만 노출된다.
 */
export const productEditorCategories: Record<ProductType, EditorCategory[]> = {
  custom_shelf: [MATERIAL, SPEC, DOORS, CHECK],
  gap_cabinet: [MATERIAL, SPEC, DOORS, CHECK],
  shoe_cabinet: [MATERIAL, SPEC, DOORS, CHECK],
  kitchen_wall_cabinet: [MATERIAL, SPEC, DOORS, CHECK],
  kitchen_base_cabinet: [MATERIAL, SPEC, FIXTURES, DOORS, CHECK],
  kitchen_island: [MATERIAL, SPEC, FIXTURES, DOORS, CHECK],
  // 칸 편집은 3D에서 캐비닛 클릭 → Kitchen3DEditDock으로 통일(우측 중복 제거)
  kitchen_full_set: [MATERIAL, SPEC, FIXTURES, DOORS, CHECK],
  built_in_wardrobe: [MATERIAL, SPEC, MODULES, DOORS, CHECK],
};

export function getEditorCategories(productType: ProductType, professional = false): EditorCategory[] {
  const base = productEditorCategories[productType] ?? [MATERIAL, SPEC, DOORS, CHECK];
  const checkIndex0 = base.findIndex((category) => category.id === "check");
  const next = [...base];
  // 전문가(시공자): '검수·주문' 앞에 제작사양(재단표·엣지·부속·현장타공) 탭을 노출
  if (professional) {
    next.splice(checkIndex0 < 0 ? next.length : checkIndex0, 0, BUILD);
  }
  // 상품추가는 미리보기 안의 이미지 타일로 이동 → 카테고리에서는 제외(중복 제거)
  void ADDPRODUCT;
  return next;
}
