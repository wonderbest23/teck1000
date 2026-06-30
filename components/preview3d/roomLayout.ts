import { KITCHEN_WALL_BOTTOM_M } from "@/components/preview3d/constants";
import {
  getKitchenSetDimensions,
  getKitchenTemplate,
  isLShapeKitchen,
  normalizeKitchenLayerWidths,
  normalizeKitchenModules,
  normalizeKitchenSideModules,
} from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";

export type RoomItem = { id: string; name: string; input: FurnitureInput };
export type Placement = { x: number; z: number; rotY: number };
/** baseY=가구 바닥 높이(상부장은 설치높이, 신발장은 띄움), topY=최상단 */
export type Footprint = { widthM: number; depthM: number; baseY: number; topY: number };

/** 방 뒷벽 고정 라인(z). 모든 가구의 뒷면은 이보다 뒤로 못 간다. */
export const ROOM_BACK = -0.45;

/** 상품의 실제(미터) 발자국 — 멀티 씬 배치/방 크기/카메라 계산용 (three 의존 없음) */
export function getFootprint(input: FurnitureInput): Footprint {
  if (input.productType === "kitchen_full_set") {
    const template = getKitchenTemplate(input.kitchen_template);
    const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
    const base = normalizeKitchenLayerWidths(layout.modules, input.kitchen_base_modules_mm);
    const dim = getKitchenSetDimensions(input, template);
    const side = normalizeKitchenSideModules(input.kitchen_side_modules_mm, input.kitchen_side_module_types);
    const isL = isLShapeKitchen(input);
    return {
      widthM: Math.max(base.reduce((s, w) => s + w, 0) / 1000, 0.6),
      depthM: dim.baseDepthMm / 1000 + (isL ? side.width_mm / 1000 : 0),
      baseY: 0,
      topY: KITCHEN_WALL_BOTTOM_M + dim.wallHeightMm / 1000,
    };
  }
  const h = Math.max(input.height_mm, 300) / 1000;
  // 상부장은 벽 설치 높이, 신발장은 하부 띄움만큼 바닥이 올라간다
  const baseY = input.productType === "kitchen_wall_cabinet" ? KITCHEN_WALL_BOTTOM_M : (input.bottom_space ?? 0) / 1000;
  return {
    widthM: Math.max(input.width_mm, 200) / 1000,
    depthM: Math.max(input.depth_mm, 150) / 1000,
    baseY,
    topY: baseY + h,
  };
}

/** 자동 배치 — 뒷벽을 따라 좌→우로 나열(뒤 정렬) */
export function autoArrange(items: RoomItem[]): Record<string, Placement> {
  const foots = items.map((it) => getFootprint(it.input));
  const gap = 0.35;
  const total = foots.reduce((s, f) => s + f.widthM, 0) + gap * Math.max(0, items.length - 1);
  let cursor = -total / 2;
  const out: Record<string, Placement> = {};
  items.forEach((it, i) => {
    const f = foots[i];
    const cx = cursor + f.widthM / 2;
    cursor += f.widthM + gap;
    // 뒷면을 고정 뒷벽(ROOM_BACK)에 맞춰 정렬
    out[it.id] = { x: cx, z: ROOM_BACK + f.depthM / 2 + 0.02, rotY: 0 };
  });
  return out;
}
