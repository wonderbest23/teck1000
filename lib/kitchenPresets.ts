// =============================================================
// lib/kitchenPresets.ts
// 한국 표준 주방 프리셋 — "빈 캔버스" 제거용 시작점 데이터
//
// [통합 노트] 실제 코드베이스 정합:
// - 모듈 종류는 lib/kitchen.ts 의 KitchenModuleType 유니온을 그대로 사용(문자열 오타 방지).
// - applyKitchenPreset 은 kitchen_base_modules_mm / kitchen_wall_modules_mm 레이어를
//   함께 갱신 — 기존 렌더러/견적이 normalizeKitchenLayerWidths 로 이 배열을 읽는다.
// - 프리셋은 layout 관련 필드만 덮어쓰고 소재/문짝/설비옵션 등은 현재 input 유지.
// =============================================================

import type { KitchenModuleType } from "@/lib/kitchen";

export type KitchenPresetId =
  | "straight_2400_gas"
  | "straight_1800"
  | "straight_2400"
  | "straight_2700"
  | "straight_3000"
  | "l_2700_1500"
  | "l_3000_1800";

/** FurnitureInput 에 그대로 머지되는 레이아웃 필드 부분집합 */
export interface KitchenPresetInput {
  kitchen_layout_shape: "straight" | "l_shape";
  kitchen_modules_mm: number[];
  kitchen_module_types: KitchenModuleType[];
  kitchen_side_modules_mm?: number[];
  kitchen_side_module_types?: KitchenModuleType[];
  kitchen_corner?: "left" | "right";
  kitchen_side_has_wall?: boolean;
  sink_module_index: number;
  cooktop_module_index: number;
  hood_module_index: number;
  /** 설비 옵션 — 프리셋에 기본 설비 포함(가스대형 등) */
  sink_option?: string;
  faucet_option?: string;
  cooktop_option?: string;
  hood_option?: string;
}

export interface KitchenPreset {
  id: KitchenPresetId;
  label: string; // 카드에 표시할 이름
  description: string; // 한 줄 설명
  totalWidthMm: number; // 메인 런 전체 폭
  shape: "straight" | "l_shape";
  input: KitchenPresetInput;
}

// -------------------------------------------------------------
// 한국 아파트 표준 치수 기반 구성
// 싱크(800~900) 창가쪽, 쿡탑(600) 반대쪽, 사이 조리대 최소 600,
// 후드는 쿡탑과 동일 인덱스.
// -------------------------------------------------------------

export const KITCHEN_PRESETS: KitchenPreset[] = [
  {
    // 제일 잘 팔리는 표준형 — 개수대 + 낮은 가스대(프리스탠딩 레인지) + 후드 포함
    id: "straight_2400_gas",
    label: "일자 2400 가스대형",
    description: "표준 인기 구성 · 1200 개수대 + 600 수납 + 600 낮은 가스대(레인지) · 후드 포함",
    totalWidthMm: 2400,
    shape: "straight",
    input: {
      kitchen_layout_shape: "straight",
      kitchen_modules_mm: [1200, 600, 600],
      kitchen_module_types: ["sink_base", "door", "gas"],
      sink_module_index: 0,
      cooktop_module_index: 2,
      hood_module_index: 2,
      sink_option: "single_780",
      faucet_option: "basic_cobra",
      cooktop_option: "free_standing_range",
      hood_option: "haatz_slide_600",
    },
  },
  {
    id: "straight_1800",
    label: "일자 1800",
    description: "원룸·소형 아파트 · 싱크+서랍+쿡탑",
    totalWidthMm: 1800,
    shape: "straight",
    input: {
      kitchen_layout_shape: "straight",
      kitchen_modules_mm: [800, 600, 400],
      kitchen_module_types: ["sink_base", "drawer", "cooktop"],
      sink_module_index: 0,
      cooktop_module_index: 2,
      hood_module_index: 2,
    },
  },
  {
    id: "straight_2400",
    label: "일자 2400",
    description: "소형 아파트 표준 · 싱크+조리대+쿡탑",
    totalWidthMm: 2400,
    shape: "straight",
    input: {
      kitchen_layout_shape: "straight",
      kitchen_modules_mm: [800, 600, 600, 400],
      kitchen_module_types: ["sink_base", "drawer", "cooktop", "door"],
      sink_module_index: 0,
      cooktop_module_index: 2,
      hood_module_index: 2,
    },
  },
  {
    id: "straight_2700",
    label: "일자 2700",
    description: "국민평형(84㎡) 표준 구성",
    totalWidthMm: 2700,
    shape: "straight",
    input: {
      kitchen_layout_shape: "straight",
      kitchen_modules_mm: [900, 600, 600, 600],
      kitchen_module_types: ["sink_base", "drawer", "cooktop", "door"],
      sink_module_index: 0,
      cooktop_module_index: 2,
      hood_module_index: 2,
    },
  },
  {
    id: "straight_3000",
    label: "일자 3000",
    description: "넉넉한 조리 공간 · 수납 강화",
    totalWidthMm: 3000,
    shape: "straight",
    input: {
      kitchen_layout_shape: "straight",
      kitchen_modules_mm: [900, 600, 600, 600, 300],
      kitchen_module_types: ["sink_base", "drawer", "drawer", "cooktop", "pullout"],
      sink_module_index: 0,
      cooktop_module_index: 3,
      hood_module_index: 3,
    },
  },
  {
    id: "l_2700_1500",
    label: "ㄱ자 2700+1500",
    description: "코너 활용 · 조리 동선 분리",
    totalWidthMm: 2700,
    shape: "l_shape",
    input: {
      kitchen_layout_shape: "l_shape",
      kitchen_modules_mm: [900, 600, 600, 600],
      kitchen_module_types: ["sink_base", "drawer", "cooktop", "door"],
      kitchen_side_modules_mm: [600, 600, 300],
      kitchen_side_module_types: ["door", "drawer", "pullout"],
      kitchen_corner: "right",
      kitchen_side_has_wall: true,
      sink_module_index: 0,
      cooktop_module_index: 2,
      hood_module_index: 2,
    },
  },
  {
    id: "l_3000_1800",
    label: "ㄱ자 3000+1800",
    description: "대형 주방 · 수납 최대",
    totalWidthMm: 3000,
    shape: "l_shape",
    input: {
      kitchen_layout_shape: "l_shape",
      kitchen_modules_mm: [900, 600, 600, 600, 300],
      kitchen_module_types: ["sink_base", "drawer", "drawer", "cooktop", "pullout"],
      kitchen_side_modules_mm: [600, 600, 600],
      kitchen_side_module_types: ["door", "door", "drawer"],
      kitchen_corner: "right",
      kitchen_side_has_wall: true,
      sink_module_index: 0,
      cooktop_module_index: 3,
      hood_module_index: 3,
    },
  },
];

/**
 * 프리셋 → 기존 FurnitureInput 에 머지.
 * 소재/문짝디자인/높이 등은 유지하고 레이아웃 관련 필드만 덮어쓴다.
 */
export function applyKitchenPreset<T extends Record<string, unknown>>(
  currentInput: T,
  preset: KitchenPreset,
): T {
  return {
    ...currentInput,
    ...preset.input,
    // 레이어 폭 동기화 — 렌더러/견적이 base/wall 레이어를 따로 읽으므로 함께 갱신
    kitchen_base_modules_mm: [...preset.input.kitchen_modules_mm],
    kitchen_wall_modules_mm: [...preset.input.kitchen_modules_mm],
  } as T;
}

/** 총 폭 → kitchen.ts 템플릿 id (견적·스펙 탭 연동) */
export function kitchenTemplateIdForWidth(widthMm: number): string {
  if (widthMm <= 1800) return "kitchen_1800_basic";
  if (widthMm <= 2400) return "kitchen_2400_standard";
  return "kitchen_3000_family";
}

/** 총 폭이 사용자 입력값과 다를 때 마지막 조정 칸(door/pullout/open/drawer)에서 차이를 흡수 */
export function fitPresetToWidth(preset: KitchenPreset, targetWidthMm: number): KitchenPreset {
  const diff = targetWidthMm - preset.totalWidthMm;
  if (diff === 0) return preset;

  const mods = [...preset.input.kitchen_modules_mm];
  const types = preset.input.kitchen_module_types;
  for (let i = mods.length - 1; i >= 0; i--) {
    if (["door", "pullout", "open", "drawer"].includes(types[i])) {
      const next = mods[i] + diff;
      if (next >= 300 && next <= 1200) {
        mods[i] = next;
        return {
          ...preset,
          totalWidthMm: targetWidthMm,
          input: { ...preset.input, kitchen_modules_mm: mods },
        };
      }
    }
  }
  return preset;
}
