import { materials } from "@/lib/catalogData";
import { productLabels } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

/**
 * AI 채팅이 만들 수 있는 것은 '지금 구현된 동작'으로만 제한된다.
 * 추가 가능한 상품/소재/문스타일/동작은 모두 아래 기존 자산에서만 나온다.
 */
export const ADDABLE_PRODUCT_TYPES: ProductType[] = [
  "desk",
  "living_cabinet",
  "kitchen_full_set",
  "kitchen_base_cabinet",
  "kitchen_wall_cabinet",
  "kitchen_island",
  "custom_shelf",
  "gap_cabinet",
  "shoe_cabinet",
  "built_in_wardrobe",
];

export const MATERIAL_NAMES = materials.map((m) => m.name);
export const DOOR_STYLES = ["flat", "frame", "slat"] as const;

export type RoomActionType = "add" | "modify" | "rotate" | "remove" | "arrange";

export type RoomAction = {
  type: RoomActionType;
  productType?: ProductType;
  material?: string;
  door_style?: (typeof DOOR_STYLES)[number];
  width_mm?: number;
  height_mm?: number;
  depth_mm?: number;
};

export type RoomCommandResult = { reply: string; actions: RoomAction[] };

/** 모델에 넘길 현재 방 상태 요약(컨텍스트) */
export type RoomStateSummary = {
  items: { id: string; name: string; productType: ProductType; width_mm: number; height_mm: number; depth_mm: number }[];
  selectedId: string | null;
};

export const PRODUCT_LABEL_LINES = ADDABLE_PRODUCT_TYPES.map((p) => `- ${p}: ${productLabels[p] ?? p}`).join("\n");
export const MATERIAL_LINES = materials.map((m) => `- ${m.name} (${m.color})`).join("\n");

/** AI가 actions를 비워 보낸 경우 — "폭 1800", "1800으로" 같은 단순 치수 명령을 로컬에서 보정 */
export function parseSimpleRoomActions(message: string, state: RoomStateSummary): RoomAction[] {
  const targetId = state.selectedId ?? state.items[0]?.id ?? null;
  if (!targetId) return [];
  const text = message.trim();
  const widthMatch = text.match(/(?:폭|가로|너비|width)[^\d]{0,6}(\d{3,4})|(\d{3,4})\s*(?:mm|㎜)?\s*(?:폭|가로)?\s*(?:으로|로)\s*(?:바꿔|변경|해|맞춰)/i);
  const heightMatch = text.match(/(?:높이|height)[^\d]{0,6}(\d{3,4})/i);
  const depthMatch = text.match(/(?:깊이|depth)[^\d]{0,6}(\d{3,4})/i);
  const width_mm = Number(widthMatch?.[1] ?? widthMatch?.[2]);
  const height_mm = heightMatch?.[1] ? Number(heightMatch[1]) : undefined;
  const depth_mm = depthMatch?.[1] ? Number(depthMatch[1]) : undefined;
  if (!Number.isFinite(width_mm) && height_mm == null && depth_mm == null) return [];
  const action: RoomAction = { type: "modify" };
  if (Number.isFinite(width_mm) && width_mm > 0) action.width_mm = width_mm;
  if (height_mm != null && Number.isFinite(height_mm)) action.height_mm = height_mm;
  if (depth_mm != null && Number.isFinite(depth_mm)) action.depth_mm = depth_mm;
  return [action];
}
