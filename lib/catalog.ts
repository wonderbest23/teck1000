import type { ProductType } from "@/lib/types";

export type CatalogCategory = {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  bg: string;
  slugs: ProductType[];
};

export const catalogCategories: CatalogCategory[] = [
  {
    id: "kitchen",
    title: "주방 가구",
    subtitle: "싱크대 · 상하부장 · 아일랜드",
    accent: "#155e75",
    bg: "#e6f4f7",
    slugs: ["kitchen_full_set", "kitchen_base_cabinet", "kitchen_wall_cabinet", "kitchen_island"],
  },
  {
    id: "office",
    title: "홈오피스 가구",
    subtitle: "책상 · 사이드장",
    accent: "#4f46e5",
    bg: "#eef2ff",
    slugs: ["desk", "gap_cabinet"],
  },
  {
    id: "living",
    title: "거실 가구",
    subtitle: "인테리어장 · TV장 · 장식장",
    accent: "#0f766e",
    bg: "#f0fdfa",
    slugs: ["living_cabinet", "custom_shelf"],
  },
  {
    id: "storage",
    title: "수납 가구",
    subtitle: "선반 · 틈새장",
    accent: "#b45309",
    bg: "#fff7ed",
    slugs: ["custom_shelf", "gap_cabinet"],
  },
  {
    id: "entrance",
    title: "현관 가구",
    subtitle: "신발장",
    accent: "#475569",
    bg: "#f1f5f9",
    slugs: ["shoe_cabinet"],
  },
  {
    id: "wardrobe",
    title: "붙박이 가구",
    subtitle: "옷장 · 드레스룸",
    accent: "#6d28d9",
    bg: "#f5f3ff",
    slugs: ["built_in_wardrobe"],
  },
];

export const productLabels: Partial<Record<ProductType, string>> = {
  desk: "맞춤 책상",
  living_cabinet: "거실 인테리어장",
  kitchen_full_set: "상하부장 세트",
  kitchen_base_cabinet: "싱크대 하부장",
  kitchen_wall_cabinet: "싱크대 상부장",
  kitchen_island: "아일랜드장",
  custom_shelf: "맞춤 선반장",
  gap_cabinet: "틈새 수납장",
  shoe_cabinet: "맞춤 신발장",
  built_in_wardrobe: "붙박이장",
};

/** 내 공간에 추가할 때 한 번 더 고르는 표준 규격(폭 기준). 없는 제품은 기본값으로 바로 추가. */
export type RoomAddPreset = { label: string; width_mm: number; height_mm: number; depth_mm: number };
export const roomAddPresets: Partial<Record<ProductType, RoomAddPreset[]>> = {
  desk: [
    { label: "1200", width_mm: 1200, height_mm: 740, depth_mm: 600 },
    { label: "1400", width_mm: 1400, height_mm: 740, depth_mm: 600 },
    { label: "1600", width_mm: 1600, height_mm: 740, depth_mm: 700 },
  ],
  living_cabinet: [
    { label: "TV장 1800", width_mm: 1800, height_mm: 500, depth_mm: 400 },
    { label: "벽장 1800", width_mm: 1800, height_mm: 1800, depth_mm: 400 },
    { label: "벽장 2400", width_mm: 2400, height_mm: 2200, depth_mm: 400 },
  ],
  kitchen_base_cabinet: [
    { label: "600", width_mm: 600, height_mm: 850, depth_mm: 600 },
    { label: "900", width_mm: 900, height_mm: 850, depth_mm: 600 },
    { label: "1200", width_mm: 1200, height_mm: 850, depth_mm: 600 },
  ],
  kitchen_wall_cabinet: [
    { label: "600", width_mm: 600, height_mm: 720, depth_mm: 340 },
    { label: "900", width_mm: 900, height_mm: 720, depth_mm: 340 },
    { label: "1200", width_mm: 1200, height_mm: 720, depth_mm: 340 },
  ],
  kitchen_island: [
    { label: "1200", width_mm: 1200, height_mm: 850, depth_mm: 700 },
    { label: "1500", width_mm: 1500, height_mm: 850, depth_mm: 700 },
  ],
  custom_shelf: [
    { label: "600", width_mm: 600, height_mm: 1200, depth_mm: 350 },
    { label: "800", width_mm: 800, height_mm: 1400, depth_mm: 350 },
    { label: "1000", width_mm: 1000, height_mm: 1800, depth_mm: 350 },
  ],
  gap_cabinet: [
    { label: "250", width_mm: 250, height_mm: 1800, depth_mm: 300 },
    { label: "350", width_mm: 350, height_mm: 1800, depth_mm: 300 },
    { label: "450", width_mm: 450, height_mm: 1800, depth_mm: 300 },
  ],
  shoe_cabinet: [
    { label: "900", width_mm: 900, height_mm: 1200, depth_mm: 350 },
    { label: "1200", width_mm: 1200, height_mm: 2100, depth_mm: 350 },
  ],
  built_in_wardrobe: [
    { label: "1800", width_mm: 1800, height_mm: 2400, depth_mm: 600 },
    { label: "2400", width_mm: 2400, height_mm: 2400, depth_mm: 600 },
    { label: "3000", width_mm: 3000, height_mm: 2400, depth_mm: 600 },
  ],
  kitchen_full_set: [
    { label: "1800", width_mm: 1800, height_mm: 850, depth_mm: 600 },
    { label: "2400", width_mm: 2400, height_mm: 850, depth_mm: 600 },
    { label: "3000", width_mm: 3000, height_mm: 850, depth_mm: 600 },
  ],
};

/** 홈 카드용 시작 예상가(원) — "예상가 ~" 표기 */
export const productFromPrice: Partial<Record<ProductType, number>> = {
  desk: 540000,
  living_cabinet: 880000,
  kitchen_full_set: 1120000,
  kitchen_island: 1480000,
  kitchen_base_cabinet: 380000,
  kitchen_wall_cabinet: 320000,
  custom_shelf: 720000,
  gap_cabinet: 290000,
  shoe_cabinet: 650000,
  built_in_wardrobe: 1680000,
};

/** 홈 '맞춤 제작 상품'에 강조 노출할 상품 */
export const featuredSlugs: ProductType[] = ["kitchen_full_set", "desk", "kitchen_island", "shoe_cabinet"];

export function getCategoryById(id: string) {
  return catalogCategories.find((category) => category.id === id);
}
