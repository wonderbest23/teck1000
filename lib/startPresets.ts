import type { FurnitureInput, ProductType } from "@/lib/types";

export type StartPresetCategoryId =
  | "kitchen"
  | "office"
  | "living"
  | "storage"
  | "entrance"
  | "wardrobe";

export type StartPresetCategory = {
  id: StartPresetCategoryId;
  title: string;
  subtitle: string;
  bg: string;
};

export type StartPreset = {
  id: string;
  categoryId: StartPresetCategoryId;
  label: string;
  hint: string;
  slug: ProductType;
  defaults: Partial<FurnitureInput>;
};

export const startPresetCategories: StartPresetCategory[] = [
  { id: "kitchen", title: "주방", subtitle: "싱크대 · 아일랜드 · 벽수납", bg: "#e6f4f7" },
  { id: "office", title: "홈오피스", subtitle: "책상 · 서랍형 책상 · 사이드장", bg: "#eef2ff" },
  { id: "living", title: "거실", subtitle: "TV장 · 인테리어장 · 장식장", bg: "#f8fafc" },
  { id: "storage", title: "수납", subtitle: "선반장 · 틈새장 · 팬트리장", bg: "#fff7ed" },
  { id: "entrance", title: "현관", subtitle: "신발장 · 벤치형 수납", bg: "#f1f5f9" },
  { id: "wardrobe", title: "붙박이", subtitle: "침실장 · 드레스룸", bg: "#f5f3ff" },
];

export const startPresets: StartPreset[] = [
  {
    id: "kitchen_set_standard",
    categoryId: "kitchen",
    label: "싱크대 상하부장 세트",
    hint: "가장 많이 쓰는 주방 기본형",
    slug: "kitchen_full_set",
    defaults: { width_mm: 2400, height_mm: 850, depth_mm: 600 },
  },
  {
    id: "kitchen_set_compact",
    categoryId: "kitchen",
    label: "소형 싱크대 1800",
    hint: "원룸·소형 주방 일자형",
    slug: "kitchen_full_set",
    defaults: {
      width_mm: 1800,
      height_mm: 850,
      depth_mm: 600,
      kitchen_template: "kitchen_1800_basic",
      kitchen_modules_mm: [800, 600, 400],
      kitchen_module_types: ["sink_base", "drawer", "cooktop"],
      sink_module_index: 0,
      cooktop_module_index: 2,
      hood_module_index: 2,
    },
  },
  {
    id: "kitchen_island_family",
    categoryId: "kitchen",
    label: "패밀리 아일랜드",
    hint: "식탁 겸용 아일랜드",
    slug: "kitchen_island",
    defaults: { width_mm: 1800, height_mm: 850, depth_mm: 700, has_door: true, door_count: 3, shelf_count: 1 },
  },
  {
    id: "wall_storage_kitchen",
    categoryId: "kitchen",
    label: "주방 벽수납장",
    hint: "벽면 상부 수납 전용",
    slug: "kitchen_wall_cabinet",
    defaults: { width_mm: 1500, height_mm: 800, depth_mm: 340, has_door: true, door_count: 3, shelf_count: 2 },
  },
  {
    id: "desk_basic",
    categoryId: "office",
    label: "기본 책상",
    hint: "재택/학습용 심플 데스크",
    slug: "desk",
    defaults: {
      width_mm: 1200,
      height_mm: 740,
      depth_mm: 600,
      has_door: false,
      door_count: 0,
      shelf_count: 1,
      storage_drawer_count: 0,
      open_type: "오픈형",
    },
  },
  {
    id: "desk_drawer",
    categoryId: "office",
    label: "서랍형 책상",
    hint: "하단 서랍 3단 포함",
    slug: "desk",
    defaults: {
      width_mm: 1400,
      height_mm: 740,
      depth_mm: 600,
      has_door: false,
      door_count: 0,
      shelf_count: 0,
      storage_drawer_count: 3,
      open_type: "오픈형",
    },
  },
  {
    id: "desk_wide",
    categoryId: "office",
    label: "와이드 책상",
    hint: "듀얼모니터/작업용 대형 상판",
    slug: "desk",
    defaults: {
      width_mm: 1800,
      height_mm: 740,
      depth_mm: 700,
      has_door: false,
      door_count: 0,
      shelf_count: 1,
      storage_drawer_count: 2,
      open_type: "오픈형",
    },
  },
  {
    id: "office_side_cabinet",
    categoryId: "office",
    label: "사무실 사이드장",
    hint: "책상 옆 보조 수납",
    slug: "gap_cabinet",
    defaults: { width_mm: 450, height_mm: 720, depth_mm: 550, has_door: true, door_count: 1, shelf_count: 2 },
  },
  {
    id: "tv_console",
    categoryId: "living",
    label: "TV 콘솔장",
    hint: "낮은 거실장",
    slug: "living_cabinet",
    defaults: {
      width_mm: 1800,
      height_mm: 520,
      depth_mm: 420,
      has_door: true,
      door_count: 4,
      shelf_count: 1,
      living_door_ratio: 0.6,
    },
  },
  {
    id: "living_wall_unit",
    categoryId: "living",
    label: "벽면 인테리어장",
    hint: "거실 벽 전체 수납형",
    slug: "living_cabinet",
    defaults: { width_mm: 2000, height_mm: 2200, depth_mm: 400, has_door: true, door_count: 4, shelf_count: 6, wall_fix_option: true },
  },
  {
    id: "display_shelf",
    categoryId: "living",
    label: "오픈 장식장",
    hint: "소품 진열/수납",
    slug: "living_cabinet",
    defaults: { width_mm: 1600, height_mm: 1900, depth_mm: 350, has_door: false, door_count: 0, shelf_count: 6, open_type: "오픈형" },
  },
  {
    id: "storage_shelf_wide",
    categoryId: "storage",
    label: "와이드 선반장",
    hint: "다용도 수납 기본형",
    slug: "custom_shelf",
    defaults: { width_mm: 1200, height_mm: 2000, depth_mm: 400, has_door: true, door_count: 3, shelf_count: 5 },
  },
  {
    id: "pantry_tall",
    categoryId: "storage",
    label: "팬트리 수납장",
    hint: "주방 옆 키큰장",
    slug: "gap_cabinet",
    defaults: { width_mm: 600, height_mm: 2100, depth_mm: 550, has_door: true, door_count: 2, shelf_count: 6 },
  },
  {
    id: "shoe_cabinet_family",
    categoryId: "entrance",
    label: "가족형 신발장",
    hint: "현관 메인 신발수납",
    slug: "shoe_cabinet",
    defaults: { width_mm: 1200, height_mm: 2100, depth_mm: 350, has_door: true, door_count: 2, shelf_count: 6, bottom_space: 100 },
  },
  {
    id: "entry_bench_storage",
    categoryId: "entrance",
    label: "벤치형 현관수납",
    hint: "신발 갈아신는 낮은 수납장",
    slug: "shoe_cabinet",
    defaults: { width_mm: 900, height_mm: 700, depth_mm: 380, has_door: true, door_count: 2, shelf_count: 2, bottom_space: 0 },
  },
  {
    id: "wardrobe_bedroom",
    categoryId: "wardrobe",
    label: "침실 붙박이장",
    hint: "기본 2.4m 벽면형",
    slug: "built_in_wardrobe",
    defaults: { width_mm: 2400, height_mm: 2400, depth_mm: 600, has_door: true, door_count: 4 },
  },
  {
    id: "wardrobe_dressing",
    categoryId: "wardrobe",
    label: "드레스룸 수납장",
    hint: "와이드 행거/선반 혼합",
    slug: "built_in_wardrobe",
    defaults: { width_mm: 3000, height_mm: 2400, depth_mm: 600, has_door: true, door_count: 5 },
  },
];

export function getStartPreset(id: string | null | undefined) {
  if (!id) return null;
  return startPresets.find((preset) => preset.id === id) ?? null;
}

export function getStartPresetsByCategory(categoryId: StartPresetCategoryId | null) {
  if (!categoryId) return [];
  return startPresets.filter((preset) => preset.categoryId === categoryId);
}

export function applyStartPreset(baseInput: FurnitureInput, presetId: string | null | undefined): FurnitureInput {
  const preset = getStartPreset(presetId);
  if (!preset) return baseInput;
  if (preset.slug !== baseInput.productType) return baseInput;
  return {
    ...baseInput,
    ...preset.defaults,
    productType: preset.slug,
  };
}
