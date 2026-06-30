"use client";

import { useCallback } from "react";
import { getDoorCountOptions, getSafeDoorCount } from "@/lib/rules";
import type { FurnitureInput } from "@/lib/types";

export function useStorageEditor(input: FurnitureInput, onInputChange?: (input: FurnitureInput) => void) {
  const isWardrobe = input.productType === "built_in_wardrobe";
  const isShoe = input.productType === "shoe_cabinet";
  const enabled = Boolean(onInputChange) && (isWardrobe || isShoe);

  const patch = useCallback(
    (partial: Partial<FurnitureInput>) => {
      if (!onInputChange) return;
      onInputChange({ ...input, ...partial });
    },
    [input, onInputChange],
  );

  const doorOptions = getDoorCountOptions(input.productType, input.width_mm, input.has_door);

  const changeShelfCount = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(12, input.shelf_count + delta));
      patch({ shelf_count: next });
    },
    [input.shelf_count, patch],
  );

  const changeDoorCount = useCallback(
    (delta: number) => {
      if (doorOptions.length === 0) return;
      const currentIndex = doorOptions.indexOf(input.door_count);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.min(Math.max(safeIndex + delta, 0), doorOptions.length - 1);
      patch({
        has_door: true,
        door_count: doorOptions[nextIndex],
      });
    },
    [doorOptions, input.door_count, patch],
  );

  const setOpenType = useCallback(
    (openType: string) => {
      patch({ open_type: openType });
    },
    [patch],
  );

  const toggleShoeShelfAngle = useCallback(() => {
    patch({ shoe_shelf_angle: !input.shoe_shelf_angle });
  }, [input.shoe_shelf_angle, patch]);

  const changeBottomSpace = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(200, (input.bottom_space ?? 0) + delta));
      patch({ bottom_space: next });
    },
    [input.bottom_space, patch],
  );

  const safeDoorCount = getSafeDoorCount(input.productType, input.width_mm, input.has_door, input.door_count);

  return {
    enabled,
    isWardrobe,
    isShoe,
    shelfCount: input.shelf_count,
    doorCount: safeDoorCount,
    doorOptions,
    openType: input.open_type ?? "여닫이",
    shoeShelfAngle: input.shoe_shelf_angle ?? false,
    bottomSpace: input.bottom_space ?? 0,
    changeShelfCount,
    changeDoorCount,
    setOpenType,
    toggleShoeShelfAngle,
    changeBottomSpace,
  };
}
