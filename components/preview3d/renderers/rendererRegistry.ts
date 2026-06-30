import type { ProductType } from "@/lib/types";
import type { PreviewRendererProps } from "@/components/preview3d/types";
import type { ComponentType } from "react";
import { KitchenBaseRenderer } from "./KitchenBaseRenderer";
import { KitchenWallRenderer } from "./KitchenWallRenderer";
import { KitchenFullSetRenderer } from "./KitchenFullSetRenderer";
import { WardrobeRenderer } from "./WardrobeRenderer";
import { ShoeCabinetRenderer } from "./ShoeCabinetRenderer";
import { ShelfRenderer } from "./ShelfRenderer";

export const rendererRegistry = {
  kitchen_base_cabinet: KitchenBaseRenderer,
  kitchen_island: KitchenBaseRenderer,
  kitchen_wall_cabinet: KitchenWallRenderer,
  kitchen_full_set: KitchenFullSetRenderer,
  built_in_wardrobe: WardrobeRenderer,
  shoe_cabinet: ShoeCabinetRenderer,
  custom_shelf: ShelfRenderer,
  gap_cabinet: ShelfRenderer,
} satisfies Partial<Record<ProductType, ComponentType<PreviewRendererProps>>>;

export function getPreviewRenderer(productType: ProductType) {
  return rendererRegistry[productType] ?? null;
}
