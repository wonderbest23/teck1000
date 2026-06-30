"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MAX_WARDROBE_MODULE_COUNT,
  MIN_WARDROBE_MODULE_COUNT,
  DEFAULT_WARDROBE_MODULE_WIDTH_MM,
  alignWardrobeCounts,
  getWardrobeDrawerCountLimits,
  normalizeWardrobeModules,
  snapWardrobeModuleWidthMm,
  wardrobeModuleTypeLabels,
  type WardrobeModuleType,
} from "@/lib/wardrobe";
import type { FurnitureInput } from "@/lib/types";

type WardrobeDoorSwing = NonNullable<FurnitureInput["wardrobe_door_swings"]>[number];

function clampIndex(index: number, maxIndex: number) {
  return Math.min(Math.max(index, 0), Math.max(0, maxIndex));
}

function alignSwings(swings: WardrobeDoorSwing[] | undefined, length: number): WardrobeDoorSwing[] {
  return Array.from({ length }, (_, index) => swings?.[index] ?? "pair");
}

export function useWardrobeEditor(input: FurnitureInput, onInputChange?: (input: FurnitureInput) => void) {
  const isWardrobe = input.productType === "built_in_wardrobe";
  const layout = isWardrobe
    ? normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm)
    : null;
  const maxIndex = Math.max(0, (layout?.modules.length ?? 1) - 1);

  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedModuleIndex((current) => (current === null ? null : clampIndex(current, maxIndex)));
  }, [maxIndex]);

  const apply = useCallback(
    (modules: number[], moduleTypes: WardrobeModuleType[], drawerCounts: number[], shelfCounts: number[], swings: WardrobeDoorSwing[]) => {
      if (!onInputChange) return;
      const normalized = normalizeWardrobeModules(modules, moduleTypes, input.width_mm);
      const length = normalized.modules.length;
      const drawerLimits = getWardrobeDrawerCountLimits(input.height_mm);
      const nextDrawerCounts = alignWardrobeCounts(drawerCounts, length, Math.min(4, drawerLimits.max), drawerLimits.min, drawerLimits.max);
      const nextShelfCounts = alignWardrobeCounts(shelfCounts, length, 4, 1, 10);
      const nextSwings = alignSwings(swings, length);
      onInputChange({
        ...input,
        width_mm: normalized.width_mm,
        has_door: true,
        door_count: length,
        wardrobe_modules_mm: normalized.modules,
        wardrobe_module_types: normalized.moduleTypes,
        wardrobe_drawer_counts: nextDrawerCounts,
        wardrobe_shelf_counts: nextShelfCounts,
        wardrobe_door_swings: nextSwings,
      });
    },
    [input, onInputChange],
  );

  const getArrays = useCallback(() => {
    const modules = layout ? [...layout.modules] : [];
    const types = layout ? [...layout.moduleTypes] : [];
    const drawerLimits = getWardrobeDrawerCountLimits(input.height_mm);
    const drawerCounts = alignWardrobeCounts(input.wardrobe_drawer_counts, modules.length, Math.min(4, drawerLimits.max), drawerLimits.min, drawerLimits.max);
    const shelfCounts = alignWardrobeCounts(input.wardrobe_shelf_counts, modules.length, 4, 1, 10);
    const swings = alignSwings(input.wardrobe_door_swings, modules.length);
    return { modules, types, drawerCounts, shelfCounts, swings };
  }, [input.height_mm, input.wardrobe_door_swings, input.wardrobe_drawer_counts, input.wardrobe_shelf_counts, layout]);

  const addModule = useCallback(() => {
    if (!layout) return;
    if (layout.modules.length >= MAX_WARDROBE_MODULE_COUNT) return;
    const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
    const insertIndex = (selectedModuleIndex ?? modules.length - 1) + 1;
    const refType = types[selectedModuleIndex ?? modules.length - 1] ?? "hang";
    modules.splice(insertIndex, 0, DEFAULT_WARDROBE_MODULE_WIDTH_MM);
    types.splice(insertIndex, 0, refType);
    drawerCounts.splice(insertIndex, 0, 4);
    shelfCounts.splice(insertIndex, 0, 4);
    swings.splice(insertIndex, 0, "pair");
    apply(modules, types, drawerCounts, shelfCounts, swings);
    setSelectedModuleIndex(insertIndex);
  }, [apply, getArrays, layout, selectedModuleIndex]);

  const removeSelectedModule = useCallback(() => {
    if (!layout || selectedModuleIndex === null) return;
    if (layout.modules.length <= MIN_WARDROBE_MODULE_COUNT) return;
    const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
    const index = clampIndex(selectedModuleIndex, modules.length - 1);
    modules.splice(index, 1);
    types.splice(index, 1);
    drawerCounts.splice(index, 1);
    shelfCounts.splice(index, 1);
    swings.splice(index, 1);
    apply(modules, types, drawerCounts, shelfCounts, swings);
    setSelectedModuleIndex((current) => (current === null ? null : Math.max(0, current - 1)));
  }, [apply, getArrays, layout, selectedModuleIndex]);

  const updateSelectedType = useCallback(
    (moduleType: WardrobeModuleType) => {
      if (!layout || selectedModuleIndex === null) return;
      const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
      types[clampIndex(selectedModuleIndex, modules.length - 1)] = moduleType;
      apply(modules, types, drawerCounts, shelfCounts, swings);
    },
    [apply, getArrays, layout, selectedModuleIndex],
  );

  const updateSelectedWidth = useCallback(
    (widthMm: number) => {
      if (!layout || selectedModuleIndex === null) return;
      const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
      modules[clampIndex(selectedModuleIndex, modules.length - 1)] = snapWardrobeModuleWidthMm(widthMm);
      apply(modules, types, drawerCounts, shelfCounts, swings);
    },
    [apply, getArrays, layout, selectedModuleIndex],
  );

  const updateSelectedDrawerCount = useCallback(
    (count: number) => {
      if (!layout || selectedModuleIndex === null) return;
      const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
      const drawerLimits = getWardrobeDrawerCountLimits(input.height_mm);
      drawerCounts[clampIndex(selectedModuleIndex, modules.length - 1)] = Math.min(drawerLimits.max, Math.max(drawerLimits.min, Math.round(count)));
      apply(modules, types, drawerCounts, shelfCounts, swings);
    },
    [apply, getArrays, input.height_mm, layout, selectedModuleIndex],
  );

  const updateSelectedShelfCount = useCallback(
    (count: number) => {
      if (!layout || selectedModuleIndex === null) return;
      const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
      shelfCounts[clampIndex(selectedModuleIndex, modules.length - 1)] = Math.min(10, Math.max(1, Math.round(count)));
      apply(modules, types, drawerCounts, shelfCounts, swings);
    },
    [apply, getArrays, layout, selectedModuleIndex],
  );

  const updateSelectedDoorSwing = useCallback(
    (swing: WardrobeDoorSwing) => {
      if (!layout || selectedModuleIndex === null) return;
      const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
      swings[clampIndex(selectedModuleIndex, modules.length - 1)] = swing;
      apply(modules, types, drawerCounts, shelfCounts, swings);
    },
    [apply, getArrays, layout, selectedModuleIndex],
  );

  const moveSelected = useCallback(
    (direction: -1 | 1) => {
      if (!layout || selectedModuleIndex === null) return;
      const { modules, types, drawerCounts, shelfCounts, swings } = getArrays();
      const from = clampIndex(selectedModuleIndex, modules.length - 1);
      const to = from + direction;
      if (to < 0 || to >= modules.length) return;
      [modules[from], modules[to]] = [modules[to], modules[from]];
      [types[from], types[to]] = [types[to], types[from]];
      [drawerCounts[from], drawerCounts[to]] = [drawerCounts[to], drawerCounts[from]];
      [shelfCounts[from], shelfCounts[to]] = [shelfCounts[to], shelfCounts[from]];
      [swings[from], swings[to]] = [swings[to], swings[from]];
      apply(modules, types, drawerCounts, shelfCounts, swings);
      setSelectedModuleIndex(to);
    },
    [apply, getArrays, layout, selectedModuleIndex],
  );

  const clearSelected = useCallback(() => setSelectedModuleIndex(null), []);

  const selectedSwing: WardrobeDoorSwing =
    selectedModuleIndex !== null ? alignSwings(input.wardrobe_door_swings, layout?.modules.length ?? 0)[selectedModuleIndex] ?? "pair" : "pair";

  return {
    enabled: isWardrobe && Boolean(onInputChange),
    layout,
    selectedModuleIndex,
    setSelectedModuleIndex,
    clearSelected,
    addModule,
    removeSelectedModule,
    updateSelectedType,
    updateSelectedWidth,
    updateSelectedDrawerCount,
    updateSelectedShelfCount,
    updateSelectedDoorSwing,
    selectedSwing,
    moveSelectedLeft: () => moveSelected(-1),
    moveSelectedRight: () => moveSelected(1),
    moduleTypeLabels: wardrobeModuleTypeLabels,
    canRemove: (layout?.modules.length ?? 0) > MIN_WARDROBE_MODULE_COUNT,
    canAdd: (layout?.modules.length ?? 0) < MAX_WARDROBE_MODULE_COUNT,
  };
}
