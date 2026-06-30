"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_KITCHEN_MODULE_WIDTH_MM,
  MAX_KITCHEN_MODULE_COUNT,
  clampModuleIndex,
  deriveModuleTypeCounts,
  getKitchenTemplate,
  kitchenModuleTypeLabels,
  normalizeKitchenLayerWidths,
  normalizeKitchenModules,
  remapIndexByMove,
  type KitchenModuleType,
} from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";
import type { DoorSwing, DragTarget, KitchenModulePart, KitchenMovableKey } from "@/components/preview3d/types";
import { getModuleCenterRatio, getModuleIndexFromRatio } from "@/components/preview3d/kitchen/moduleLayout";

export function useKitchenEditor(input: FurnitureInput, onInputChange?: (input: FurnitureInput) => void) {
  const kitchenTemplate = input.productType === "kitchen_full_set" ? getKitchenTemplate(input.kitchen_template) : null;
  const kitchenLayout = kitchenTemplate
    ? normalizeKitchenModules(kitchenTemplate, input.kitchen_modules_mm, input.kitchen_module_types)
    : null;
  const kitchenBaseModules = kitchenLayout ? normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_base_modules_mm) : null;
  const kitchenWallModules = kitchenLayout ? normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_wall_modules_mm) : null;
  const maxKitchenModuleIndex = Math.max(0, (kitchenLayout?.modules.length ?? 1) - 1);

  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
  const [activeDragTarget, setActiveDragTarget] = useState<DragTarget | null>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const dragRatioRef = useRef<number | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const suppressLayerClickRef = useRef(false);

  const normalizeHiddenIndices = useCallback((indices: number[] | undefined, length: number) => {
    return Array.from(new Set((indices ?? []).map((index) => clampModuleIndex(index, length - 1)))).filter((index) => index < length);
  }, []);

  const shiftHiddenForInsert = useCallback((indices: number[] | undefined, insertIndex: number, length: number) => {
    return normalizeHiddenIndices(indices, length).map((index) => (index >= insertIndex ? index + 1 : index));
  }, [normalizeHiddenIndices]);

  const shiftHiddenForRemove = useCallback((indices: number[] | undefined, removeIndex: number, length: number) => {
    return normalizeHiddenIndices(indices, length)
      .filter((index) => index !== removeIndex)
      .map((index) => (index > removeIndex ? index - 1 : index));
  }, [normalizeHiddenIndices]);

  const shiftWidthsForInsert = useCallback((widths: number[] | null, insertIndex: number, insertedWidth: number) => {
    const next = [...(widths ?? [])];
    next.splice(insertIndex, 0, insertedWidth);
    return next;
  }, []);

  const shiftWidthsForRemove = useCallback((widths: number[] | null, removeIndex: number) => {
    const next = [...(widths ?? [])];
    next.splice(removeIndex, 1);
    return next;
  }, []);

  const swapIndexedValue = useCallback((value: number | undefined, fromIndex: number, toIndex: number, fallback: number) => {
    const safe = value ?? fallback;
    if (safe === fromIndex) return toIndex;
    if (safe === toIndex) return fromIndex;
    return safe;
  }, []);

  useEffect(() => {
    setSelectedModuleIndex((current) => (current === null ? null : clampModuleIndex(current, maxKitchenModuleIndex)));
  }, [maxKitchenModuleIndex]);

  const applyKitchenChange = useCallback(
    (nextModules: number[], nextModuleTypes: KitchenModuleType[], overrides: Partial<FurnitureInput> = {}) => {
      if (!kitchenTemplate || !onInputChange) return;
      const normalizedLayout = normalizeKitchenModules(kitchenTemplate, nextModules, nextModuleTypes);
      const normalizedBaseModules = normalizeKitchenLayerWidths(normalizedLayout.modules, overrides.kitchen_base_modules_mm ?? input.kitchen_base_modules_mm);
      const normalizedWallModules = normalizeKitchenLayerWidths(normalizedLayout.modules, overrides.kitchen_wall_modules_mm ?? input.kitchen_wall_modules_mm);
      const counts = deriveModuleTypeCounts(normalizedLayout.moduleTypes);
      const maxIndex = normalizedLayout.modules.length - 1;
      const defaultSink = clampModuleIndex(kitchenTemplate.sinkModuleIndex, maxIndex);
      const defaultCooktop = clampModuleIndex(kitchenTemplate.cooktopModuleIndex, maxIndex);
      onInputChange({
        ...input,
        ...overrides,
        kitchen_modules_mm: normalizedLayout.modules,
        kitchen_base_modules_mm: normalizedBaseModules,
        kitchen_wall_modules_mm: normalizedWallModules,
        kitchen_module_types: normalizedLayout.moduleTypes,
        kitchen_drawer_counts: normalizedLayout.modules.map((_, index) => {
          const nextCounts = overrides.kitchen_drawer_counts;
          const value = nextCounts?.[index] ?? input.kitchen_drawer_counts?.[index] ?? 3;
          return Math.min(3, Math.max(1, Math.round(value)));
        }),
        kitchen_base_shelf_counts: normalizedLayout.modules.map((_, index) => {
          const nextCounts = overrides.kitchen_base_shelf_counts;
          const value = nextCounts?.[index] ?? input.kitchen_base_shelf_counts?.[index] ?? input.shelf_count ?? 1;
          return Math.min(8, Math.max(0, Math.round(value)));
        }),
        kitchen_wall_shelf_counts: normalizedLayout.modules.map((_, index) => {
          const nextCounts = overrides.kitchen_wall_shelf_counts;
          const value = nextCounts?.[index] ?? input.kitchen_wall_shelf_counts?.[index] ?? 1;
          return Math.min(8, Math.max(0, Math.round(value)));
        }),
        kitchen_door_swings: normalizedLayout.modules.map((_, index) => {
          const nextSwings = overrides.kitchen_door_swings;
          return nextSwings?.[index] ?? input.kitchen_door_swings?.[index] ?? "pair";
        }),
        kitchen_base_hidden_indices: normalizeHiddenIndices(overrides.kitchen_base_hidden_indices ?? input.kitchen_base_hidden_indices, normalizedLayout.modules.length),
        kitchen_wall_hidden_indices: normalizeHiddenIndices(overrides.kitchen_wall_hidden_indices ?? input.kitchen_wall_hidden_indices, normalizedLayout.modules.length),
        width_mm: normalizedLayout.width_mm,
        door_count: normalizedLayout.modules.length,
        drawer_module_count: counts.drawer,
        pullout_module_count: counts.pullout,
        sink_module_index: clampModuleIndex(overrides.sink_module_index ?? input.sink_module_index ?? defaultSink, maxIndex),
        cooktop_module_index: clampModuleIndex(overrides.cooktop_module_index ?? input.cooktop_module_index ?? defaultCooktop, maxIndex),
        hood_module_index: clampModuleIndex(overrides.hood_module_index ?? input.hood_module_index ?? input.cooktop_module_index ?? defaultCooktop, maxIndex),
        microwave_module_index: clampModuleIndex(overrides.microwave_module_index ?? input.microwave_module_index ?? maxIndex, maxIndex),
      });
    },
    [input, kitchenTemplate, normalizeHiddenIndices, onInputChange],
  );

  const addKitchenModule = useCallback((part: KitchenModulePart = "base", side: "left" | "right" = "right") => {
    if (!kitchenLayout) return;
    if (kitchenLayout.modules.length >= MAX_KITCHEN_MODULE_COUNT) return;
    const baseIndex = selectedModuleIndex ?? maxKitchenModuleIndex;
    const insertIndex = side === "left" ? baseIndex : baseIndex + 1;
    const nextLength = kitchenLayout.modules.length + 1;
    const nextModules = [...kitchenLayout.modules];
    const nextTypes = [...kitchenLayout.moduleTypes] as KitchenModuleType[];
    nextModules.splice(insertIndex, 0, DEFAULT_KITCHEN_MODULE_WIDTH_MM);
    nextTypes.splice(insertIndex, 0, "door");
    const nextSwings = [...(input.kitchen_door_swings ?? kitchenLayout.modules.map(() => "pair" as DoorSwing))];
    nextSwings.splice(insertIndex, 0, "pair");
    const nextDrawerCounts = [...(input.kitchen_drawer_counts ?? kitchenLayout.modules.map(() => 3))];
    nextDrawerCounts.splice(insertIndex, 0, 3);
    const nextBaseShelfCounts = [...(input.kitchen_base_shelf_counts ?? kitchenLayout.modules.map(() => Math.max(1, input.shelf_count ?? 1)))];
    nextBaseShelfCounts.splice(insertIndex, 0, Math.max(1, input.shelf_count ?? 1));
    const nextWallShelfCounts = [...(input.kitchen_wall_shelf_counts ?? kitchenLayout.modules.map(() => 1))];
    nextWallShelfCounts.splice(insertIndex, 0, 1);
    const nextBaseHidden = shiftHiddenForInsert(input.kitchen_base_hidden_indices, insertIndex, nextLength);
    const nextWallHidden = shiftHiddenForInsert(input.kitchen_wall_hidden_indices, insertIndex, nextLength);
    const nextBaseModules = shiftWidthsForInsert(kitchenBaseModules, insertIndex, DEFAULT_KITCHEN_MODULE_WIDTH_MM);
    const nextWallModules = shiftWidthsForInsert(kitchenWallModules, insertIndex, DEFAULT_KITCHEN_MODULE_WIDTH_MM);
    if (part === "base") nextWallHidden.push(insertIndex);
    else nextBaseHidden.push(insertIndex);
    const nextWallOffsets = input.kitchen_wall_offset_mm ? [...input.kitchen_wall_offset_mm] : null;
    if (nextWallOffsets) nextWallOffsets.splice(insertIndex, 0, 0);
    const shiftIndex = (value: number | undefined, fallback: number) => {
      const safe = value ?? fallback;
      return safe >= insertIndex ? safe + 1 : safe;
    };
    applyKitchenChange(nextModules, nextTypes, {
      sink_module_index: shiftIndex(input.sink_module_index, 0),
      cooktop_module_index: shiftIndex(input.cooktop_module_index, 0),
      hood_module_index: shiftIndex(input.hood_module_index, 0),
      microwave_module_index: shiftIndex(input.microwave_module_index, maxKitchenModuleIndex),
      kitchen_door_swings: nextSwings,
      kitchen_drawer_counts: nextDrawerCounts,
      kitchen_base_shelf_counts: nextBaseShelfCounts,
      kitchen_wall_shelf_counts: nextWallShelfCounts,
      kitchen_base_modules_mm: nextBaseModules,
      kitchen_wall_modules_mm: nextWallModules,
      kitchen_base_hidden_indices: nextBaseHidden,
      kitchen_wall_hidden_indices: nextWallHidden,
      ...(nextWallOffsets ? { kitchen_wall_offset_mm: nextWallOffsets } : {}),
    });
    setSelectedModuleIndex(insertIndex);
  }, [applyKitchenChange, input, kitchenBaseModules, kitchenLayout, kitchenWallModules, maxKitchenModuleIndex, selectedModuleIndex, shiftHiddenForInsert, shiftWidthsForInsert]);

  const removeSelectedModulePart = useCallback((part: KitchenModulePart = "base") => {
    if (!kitchenLayout) return;
    if (selectedModuleIndex === null) return;
    const index = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
    const length = kitchenLayout.modules.length;
    const baseHidden = normalizeHiddenIndices(input.kitchen_base_hidden_indices, length);
    const wallHidden = normalizeHiddenIndices(input.kitchen_wall_hidden_indices, length);
    const nextBaseHidden = part === "base" ? Array.from(new Set([...baseHidden, index])) : baseHidden;
    const nextWallHidden = part === "wall" ? Array.from(new Set([...wallHidden, index])) : wallHidden;
    const baseHiddenAfter = nextBaseHidden.includes(index);
    const wallHiddenAfter = nextWallHidden.includes(index);

    if (!baseHiddenAfter || !wallHiddenAfter || kitchenLayout.modules.length <= 1) {
      applyKitchenChange(kitchenLayout.modules, kitchenLayout.moduleTypes as KitchenModuleType[], {
        kitchen_base_hidden_indices: nextBaseHidden,
        kitchen_wall_hidden_indices: nextWallHidden,
      });
      return;
    }

    const removeIndex = index;
    const nextModules = [...kitchenLayout.modules];
    const nextTypes = [...kitchenLayout.moduleTypes] as KitchenModuleType[];
    const nextSwings = [...(input.kitchen_door_swings ?? kitchenLayout.modules.map(() => "pair" as DoorSwing))];
    const nextDrawerCounts = [...(input.kitchen_drawer_counts ?? kitchenLayout.modules.map(() => 3))];
    const nextBaseShelfCounts = [...(input.kitchen_base_shelf_counts ?? kitchenLayout.modules.map(() => Math.max(1, input.shelf_count ?? 1)))];
    const nextWallShelfCounts = [...(input.kitchen_wall_shelf_counts ?? kitchenLayout.modules.map(() => 1))];
    const nextBaseModules = shiftWidthsForRemove(kitchenBaseModules, removeIndex);
    const nextWallModules = shiftWidthsForRemove(kitchenWallModules, removeIndex);
    nextModules.splice(removeIndex, 1);
    nextTypes.splice(removeIndex, 1);
    nextSwings.splice(removeIndex, 1);
    nextDrawerCounts.splice(removeIndex, 1);
    nextBaseShelfCounts.splice(removeIndex, 1);
    nextWallShelfCounts.splice(removeIndex, 1);
    const shiftIndex = (value: number | undefined, fallback: number) => {
      const safe = value ?? fallback;
      if (safe === removeIndex) return Math.max(0, removeIndex - 1);
      if (safe > removeIndex) return safe - 1;
      return safe;
    };
    applyKitchenChange(nextModules, nextTypes, {
      sink_module_index: shiftIndex(input.sink_module_index, 0),
      cooktop_module_index: shiftIndex(input.cooktop_module_index, 0),
      hood_module_index: shiftIndex(input.hood_module_index, 0),
      microwave_module_index: shiftIndex(input.microwave_module_index, maxKitchenModuleIndex),
      kitchen_door_swings: nextSwings,
      kitchen_drawer_counts: nextDrawerCounts,
      kitchen_base_shelf_counts: nextBaseShelfCounts,
      kitchen_wall_shelf_counts: nextWallShelfCounts,
      kitchen_base_modules_mm: nextBaseModules,
      kitchen_wall_modules_mm: nextWallModules,
      kitchen_base_hidden_indices: shiftHiddenForRemove(nextBaseHidden, removeIndex, length),
      kitchen_wall_hidden_indices: shiftHiddenForRemove(nextWallHidden, removeIndex, length),
    });
    setSelectedModuleIndex((current) => {
      if (current === null) return null;
      return Math.max(0, current - (current >= removeIndex ? 1 : 0));
    });
  }, [applyKitchenChange, input, kitchenBaseModules, kitchenLayout, kitchenWallModules, maxKitchenModuleIndex, normalizeHiddenIndices, selectedModuleIndex, shiftHiddenForRemove, shiftWidthsForRemove]);

  const restoreModulePart = useCallback(
    (moduleIndex: number, part: KitchenModulePart) => {
      if (!kitchenLayout) return;
      const index = clampModuleIndex(moduleIndex, kitchenLayout.modules.length - 1);
      const baseHidden = normalizeHiddenIndices(input.kitchen_base_hidden_indices, kitchenLayout.modules.length);
      const wallHidden = normalizeHiddenIndices(input.kitchen_wall_hidden_indices, kitchenLayout.modules.length);
      applyKitchenChange(kitchenLayout.modules, kitchenLayout.moduleTypes as KitchenModuleType[], {
        kitchen_base_hidden_indices: part === "base" ? baseHidden.filter((hiddenIndex) => hiddenIndex !== index) : baseHidden,
        kitchen_wall_hidden_indices: part === "wall" ? wallHidden.filter((hiddenIndex) => hiddenIndex !== index) : wallHidden,
      });
      setSelectedModuleIndex(index);
    },
    [applyKitchenChange, input.kitchen_base_hidden_indices, input.kitchen_wall_hidden_indices, kitchenLayout, normalizeHiddenIndices],
  );

  const updateSelectedModuleType = useCallback(
    (moduleType: KitchenModuleType) => {
      if (!kitchenLayout) return;
      if (selectedModuleIndex === null) return;
      const moduleIndex = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
      const nextTypes = [...kitchenLayout.moduleTypes] as KitchenModuleType[];
      nextTypes[moduleIndex] = moduleType;
      applyKitchenChange(kitchenLayout.modules, nextTypes);
    },
    [applyKitchenChange, kitchenLayout, selectedModuleIndex],
  );

  const updateSelectedDrawerCount = useCallback(
    (drawerCount: number) => {
      if (!kitchenLayout) return;
      if (!onInputChange) return;
      if (selectedModuleIndex === null) return;
      const moduleIndex = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
      const nextCounts = [...(input.kitchen_drawer_counts ?? kitchenLayout.modules.map(() => 3))];
      nextCounts[moduleIndex] = Math.min(3, Math.max(1, Math.round(drawerCount)));
      onInputChange({ ...input, kitchen_drawer_counts: nextCounts });
    },
    [input, kitchenLayout, onInputChange, selectedModuleIndex],
  );

  const updateBaseDrawerCount = useCallback(
    (drawerCount: number) => {
      if (!onInputChange || input.productType !== "kitchen_base_cabinet") return;
      onInputChange({ ...input, kitchen_drawer_counts: [Math.min(3, Math.max(1, Math.round(drawerCount)))] });
    },
    [input, onInputChange],
  );

  const updateSelectedShelfCount = useCallback(
    (shelfCount: number, part: KitchenModulePart) => {
      if (!kitchenLayout || !onInputChange) return;
      if (selectedModuleIndex === null) return;
      const moduleIndex = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
      const nextCount = Math.min(8, Math.max(0, Math.round(shelfCount)));
      if (part === "wall") {
        const nextCounts = [...(input.kitchen_wall_shelf_counts ?? kitchenLayout.modules.map(() => 1))];
        nextCounts[moduleIndex] = nextCount;
        onInputChange({ ...input, kitchen_wall_shelf_counts: nextCounts });
        return;
      }
      const nextCounts = [...(input.kitchen_base_shelf_counts ?? kitchenLayout.modules.map(() => Math.max(1, input.shelf_count ?? 1)))];
      nextCounts[moduleIndex] = nextCount;
      onInputChange({ ...input, kitchen_base_shelf_counts: nextCounts });
    },
    [input, kitchenLayout, onInputChange, selectedModuleIndex],
  );

  const updateBaseShelfCount = useCallback(
    (shelfCount: number) => {
      if (!onInputChange || input.productType !== "kitchen_base_cabinet") return;
      onInputChange({ ...input, kitchen_base_shelf_counts: [Math.min(8, Math.max(0, Math.round(shelfCount)))], shelf_count: Math.min(8, Math.max(0, Math.round(shelfCount))) });
    },
    [input, onInputChange],
  );

  const updateSelectedModuleWidth = useCallback(
    (widthMm: number, part: KitchenModulePart) => {
      if (!kitchenLayout || !kitchenBaseModules || !kitchenWallModules) return;
      if (selectedModuleIndex === null) return;
      const moduleIndex = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
      const nextBaseModules = [...kitchenBaseModules];
      const nextWallModules = [...kitchenWallModules];
      if (part === "base") nextBaseModules[moduleIndex] = widthMm;
      else nextWallModules[moduleIndex] = widthMm;
      applyKitchenChange(kitchenLayout.modules, kitchenLayout.moduleTypes as KitchenModuleType[], {
        kitchen_base_modules_mm: nextBaseModules,
        kitchen_wall_modules_mm: nextWallModules,
      });
    },
    [applyKitchenChange, kitchenBaseModules, kitchenLayout, kitchenWallModules, selectedModuleIndex],
  );

  const syncSelectedModuleWidths = useCallback(
    (sourcePart: KitchenModulePart, minWidthMm: number) => {
      if (!kitchenLayout || !kitchenBaseModules || !kitchenWallModules) return;
      if (selectedModuleIndex === null) return;
      const moduleIndex = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
      const sourceModules = sourcePart === "wall" ? kitchenWallModules : kitchenBaseModules;
      const targetWidth = Math.max(sourceModules[moduleIndex] ?? kitchenLayout.modules[moduleIndex], minWidthMm);
      const nextBaseModules = [...kitchenBaseModules];
      const nextWallModules = [...kitchenWallModules];
      nextBaseModules[moduleIndex] = targetWidth;
      nextWallModules[moduleIndex] = targetWidth;
      applyKitchenChange(kitchenLayout.modules, kitchenLayout.moduleTypes as KitchenModuleType[], {
        kitchen_base_modules_mm: nextBaseModules,
        kitchen_wall_modules_mm: nextWallModules,
      });
    },
    [applyKitchenChange, kitchenBaseModules, kitchenLayout, kitchenWallModules, selectedModuleIndex],
  );

  const syncAllModuleWidths = useCallback(
    (sourcePart: KitchenModulePart, minWidthsMm: number[] = []) => {
      if (!kitchenLayout || !kitchenBaseModules || !kitchenWallModules) return;
      const sourceModules = sourcePart === "wall" ? kitchenWallModules : kitchenBaseModules;
      const nextBaseModules = kitchenLayout.modules.map((moduleWidth, index) => {
        return Math.max(sourceModules[index] ?? moduleWidth, minWidthsMm[index] ?? moduleWidth);
      });
      const nextWallModules = kitchenLayout.modules.map((moduleWidth, index) => {
        return Math.max(sourceModules[index] ?? moduleWidth, minWidthsMm[index] ?? moduleWidth);
      });
      applyKitchenChange(kitchenLayout.modules, kitchenLayout.moduleTypes as KitchenModuleType[], {
        kitchen_base_modules_mm: nextBaseModules,
        kitchen_wall_modules_mm: nextWallModules,
      });
    },
    [applyKitchenChange, kitchenBaseModules, kitchenLayout, kitchenWallModules],
  );

  const moveKitchenItem = useCallback(
    (key: KitchenMovableKey, moduleIndex: number) => {
      if (!kitchenLayout) return;
      const safeIndex = clampModuleIndex(moduleIndex, kitchenLayout.modules.length - 1);
      const nextTypes = [...kitchenLayout.moduleTypes] as KitchenModuleType[];
      const nextOverrides: Partial<FurnitureInput> = { [key]: safeIndex };

      if (key === "sink_module_index") {
        const previousIndex = clampModuleIndex(input.sink_module_index ?? safeIndex, kitchenLayout.modules.length - 1);
        if (nextTypes[previousIndex] === "sink_base") nextTypes[previousIndex] = "door";
        nextTypes[safeIndex] = "sink_base";
        nextOverrides.kitchen_base_hidden_indices = normalizeHiddenIndices(input.kitchen_base_hidden_indices, kitchenLayout.modules.length).filter((index) => index !== safeIndex);
      }

      if (key === "cooktop_module_index") {
        const previousIndex = clampModuleIndex(input.cooktop_module_index ?? safeIndex, kitchenLayout.modules.length - 1);
        if (["cooktop", "gas"].includes(nextTypes[previousIndex] ?? "")) nextTypes[previousIndex] = "door";
        nextTypes[safeIndex] = input.cooktop_option === "free_standing_range" ? "gas" : "cooktop";
        nextOverrides.kitchen_base_hidden_indices = normalizeHiddenIndices(input.kitchen_base_hidden_indices, kitchenLayout.modules.length).filter((index) => index !== safeIndex);
      }

      if (key === "hood_module_index" || key === "microwave_module_index") {
        nextOverrides.kitchen_wall_hidden_indices = normalizeHiddenIndices(input.kitchen_wall_hidden_indices, kitchenLayout.modules.length).filter((index) => index !== safeIndex);
      }

      if (key === "cooktop_module_index" && input.hood_module_index === input.cooktop_module_index) {
        nextOverrides.hood_module_index = safeIndex;
      }
      applyKitchenChange(kitchenLayout.modules, nextTypes, nextOverrides);
    },
    [applyKitchenChange, input.cooktop_module_index, input.cooktop_option, input.hood_module_index, input.kitchen_base_hidden_indices, input.kitchen_wall_hidden_indices, input.sink_module_index, kitchenLayout, normalizeHiddenIndices],
  );

  const moveKitchenModule = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!kitchenLayout || fromIndex === toIndex) return;
      const nextModules = [...kitchenLayout.modules];
      const nextTypes = [...kitchenLayout.moduleTypes] as KitchenModuleType[];
      const nextSwings = [...(input.kitchen_door_swings ?? kitchenLayout.modules.map(() => "pair" as DoorSwing))];
      const nextDrawerCounts = [...(input.kitchen_drawer_counts ?? kitchenLayout.modules.map(() => 3))];
      const nextBaseShelfCounts = [...(input.kitchen_base_shelf_counts ?? kitchenLayout.modules.map(() => Math.max(1, input.shelf_count ?? 1)))];
      const nextWallShelfCounts = [...(input.kitchen_wall_shelf_counts ?? kitchenLayout.modules.map(() => 1))];
      const nextBaseModules = [...(kitchenBaseModules ?? kitchenLayout.modules)];
      const nextWallModules = [...(kitchenWallModules ?? kitchenLayout.modules)];
      const [movedModule] = nextModules.splice(fromIndex, 1);
      const [movedType] = nextTypes.splice(fromIndex, 1);
      const [movedSwing] = nextSwings.splice(fromIndex, 1);
      const [movedDrawerCount] = nextDrawerCounts.splice(fromIndex, 1);
      const [movedBaseShelfCount] = nextBaseShelfCounts.splice(fromIndex, 1);
      const [movedWallShelfCount] = nextWallShelfCounts.splice(fromIndex, 1);
      const [movedBaseWidth] = nextBaseModules.splice(fromIndex, 1);
      const [movedWallWidth] = nextWallModules.splice(fromIndex, 1);
      nextModules.splice(toIndex, 0, movedModule);
      nextTypes.splice(toIndex, 0, movedType);
      nextSwings.splice(toIndex, 0, movedSwing ?? "pair");
      nextDrawerCounts.splice(toIndex, 0, movedDrawerCount ?? 3);
      nextBaseShelfCounts.splice(toIndex, 0, movedBaseShelfCount ?? Math.max(1, input.shelf_count ?? 1));
      nextWallShelfCounts.splice(toIndex, 0, movedWallShelfCount ?? 1);
      nextBaseModules.splice(toIndex, 0, movedBaseWidth ?? movedModule);
      nextWallModules.splice(toIndex, 0, movedWallWidth ?? movedModule);
      applyKitchenChange(nextModules, nextTypes, {
        sink_module_index: remapIndexByMove(input.sink_module_index ?? 0, fromIndex, toIndex),
        cooktop_module_index: remapIndexByMove(input.cooktop_module_index ?? 0, fromIndex, toIndex),
        hood_module_index: remapIndexByMove(input.hood_module_index ?? 0, fromIndex, toIndex),
        microwave_module_index: remapIndexByMove(input.microwave_module_index ?? maxKitchenModuleIndex, fromIndex, toIndex),
        kitchen_door_swings: nextSwings,
        kitchen_drawer_counts: nextDrawerCounts,
        kitchen_base_shelf_counts: nextBaseShelfCounts,
        kitchen_wall_shelf_counts: nextWallShelfCounts,
        kitchen_base_modules_mm: nextBaseModules,
        kitchen_wall_modules_mm: nextWallModules,
      });
    },
    [applyKitchenChange, input, kitchenBaseModules, kitchenLayout, kitchenWallModules, maxKitchenModuleIndex],
  );

  const moveKitchenModulePart = useCallback(
    (fromIndex: number, toIndex: number, part: KitchenModulePart) => {
      if (!kitchenLayout || fromIndex === toIndex) return;
      const maxIndex = kitchenLayout.modules.length - 1;
      const from = clampModuleIndex(fromIndex, maxIndex);
      const to = clampModuleIndex(toIndex, maxIndex);
      if (from === to) return;

      const nextTypes = [...kitchenLayout.moduleTypes] as KitchenModuleType[];
      const nextSwings = [...(input.kitchen_door_swings ?? kitchenLayout.modules.map(() => "pair" as DoorSwing))];
      const nextDrawerCounts = [...(input.kitchen_drawer_counts ?? kitchenLayout.modules.map(() => 3))];
      const nextBaseShelfCounts = [...(input.kitchen_base_shelf_counts ?? kitchenLayout.modules.map(() => Math.max(1, input.shelf_count ?? 1)))];
      const nextWallShelfCounts = [...(input.kitchen_wall_shelf_counts ?? kitchenLayout.modules.map(() => 1))];
      const nextBaseModules = [...(kitchenBaseModules ?? kitchenLayout.modules)];
      const nextWallModules = [...(kitchenWallModules ?? kitchenLayout.modules)];
      const baseHidden = normalizeHiddenIndices(input.kitchen_base_hidden_indices, kitchenLayout.modules.length);
      const wallHidden = normalizeHiddenIndices(input.kitchen_wall_hidden_indices, kitchenLayout.modules.length);
      const hiddenForPart = part === "base" ? baseHidden : wallHidden;
      const targetWasHidden = hiddenForPart.includes(to);

      if (part === "base") {
        if (targetWasHidden) {
          nextBaseModules[to] = nextBaseModules[from] ?? kitchenLayout.modules[from];
          nextBaseModules[from] = kitchenLayout.modules[from];
        } else {
          [nextBaseModules[from], nextBaseModules[to]] = [nextBaseModules[to] ?? kitchenLayout.modules[to], nextBaseModules[from] ?? kitchenLayout.modules[from]];
        }
        if (targetWasHidden) {
          nextTypes[to] = nextTypes[from] ?? "door";
          nextDrawerCounts[to] = nextDrawerCounts[from] ?? 3;
          nextBaseShelfCounts[to] = nextBaseShelfCounts[from] ?? Math.max(1, input.shelf_count ?? 1);
        } else {
          [nextTypes[from], nextTypes[to]] = [nextTypes[to], nextTypes[from]];
          [nextDrawerCounts[from], nextDrawerCounts[to]] = [nextDrawerCounts[to] ?? 3, nextDrawerCounts[from] ?? 3];
          [nextBaseShelfCounts[from], nextBaseShelfCounts[to]] = [nextBaseShelfCounts[to] ?? Math.max(1, input.shelf_count ?? 1), nextBaseShelfCounts[from] ?? Math.max(1, input.shelf_count ?? 1)];
        }
      } else if (targetWasHidden) {
        nextWallModules[to] = nextWallModules[from] ?? kitchenLayout.modules[from];
        nextWallModules[from] = kitchenLayout.modules[from];
        nextSwings[to] = nextSwings[from] ?? "pair";
        nextWallShelfCounts[to] = nextWallShelfCounts[from] ?? 1;
      } else {
        [nextWallModules[from], nextWallModules[to]] = [nextWallModules[to] ?? kitchenLayout.modules[to], nextWallModules[from] ?? kitchenLayout.modules[from]];
        [nextSwings[from], nextSwings[to]] = [nextSwings[to] ?? "pair", nextSwings[from] ?? "pair"];
        [nextWallShelfCounts[from], nextWallShelfCounts[to]] = [nextWallShelfCounts[to] ?? 1, nextWallShelfCounts[from] ?? 1];
      }

      const moveVisibility = (indices: number[]) => {
        const next = new Set(indices);
        if (targetWasHidden) {
          next.add(from);
          next.delete(to);
        }
        return normalizeHiddenIndices(Array.from(next), kitchenLayout.modules.length);
      };

      const nextBaseHidden = part === "base" ? moveVisibility(baseHidden) : baseHidden;
      const nextWallHidden = part === "wall" ? moveVisibility(wallHidden) : wallHidden;
      const swapIndex = (value: number | undefined, fallback: number) => swapIndexedValue(value, from, to, fallback);

      applyKitchenChange(kitchenLayout.modules, nextTypes, {
        sink_module_index: part === "base" ? swapIndex(input.sink_module_index, 0) : input.sink_module_index,
        cooktop_module_index: part === "base" ? swapIndex(input.cooktop_module_index, 0) : input.cooktop_module_index,
        hood_module_index: part === "wall" ? swapIndex(input.hood_module_index, 0) : input.hood_module_index,
        microwave_module_index: part === "wall" ? swapIndex(input.microwave_module_index, maxKitchenModuleIndex) : input.microwave_module_index,
        kitchen_door_swings: nextSwings,
        kitchen_drawer_counts: nextDrawerCounts,
        kitchen_base_shelf_counts: nextBaseShelfCounts,
        kitchen_wall_shelf_counts: nextWallShelfCounts,
        kitchen_base_modules_mm: nextBaseModules,
        kitchen_wall_modules_mm: nextWallModules,
        kitchen_base_hidden_indices: nextBaseHidden,
        kitchen_wall_hidden_indices: nextWallHidden,
      });
      setSelectedModuleIndex(to);
    },
    [applyKitchenChange, input, kitchenBaseModules, kitchenLayout, kitchenWallModules, maxKitchenModuleIndex, normalizeHiddenIndices, swapIndexedValue],
  );

  const moveSelectedModuleLeft = useCallback(() => {
    if (!kitchenLayout) return;
    if (selectedModuleIndex === null) return;
    const idx = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
    if (idx <= 0) return;
    moveKitchenModule(idx, idx - 1);
    setSelectedModuleIndex(idx - 1);
  }, [kitchenLayout, moveKitchenModule, selectedModuleIndex]);

  const moveSelectedModuleRight = useCallback(() => {
    if (!kitchenLayout) return;
    if (selectedModuleIndex === null) return;
    const idx = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
    if (idx >= kitchenLayout.modules.length - 1) return;
    moveKitchenModule(idx, idx + 1);
    setSelectedModuleIndex(idx + 1);
  }, [kitchenLayout, moveKitchenModule, selectedModuleIndex]);

  const updateBaseModuleType = useCallback(
    (moduleType: KitchenModuleType) => {
      if (!onInputChange || input.productType !== "kitchen_base_cabinet") return;
      onInputChange({
        ...input,
        kitchen_module_types: [moduleType],
        drawer_module_count: moduleType === "drawer" ? 1 : 0,
        pullout_module_count: moduleType === "pullout" ? 1 : 0,
      });
    },
    [input, onInputChange],
  );

  const updateSelectedDoorSwing = useCallback(
    (doorSwing: DoorSwing, part: KitchenModulePart = "base") => {
      if (!kitchenLayout || !onInputChange) return;
      if (selectedModuleIndex === null) return;
      const moduleIndex = clampModuleIndex(selectedModuleIndex, kitchenLayout.modules.length - 1);
      // 상부(wall)는 kitchen_wall_door_swings에, 하부(base)는 kitchen_door_swings에 — 상·하부 독립
      if (part === "wall") {
        const baseSwings = input.kitchen_door_swings ?? kitchenLayout.modules.map(() => "pair" as DoorSwing);
        const nextSwings = kitchenLayout.modules.map((_, i) => input.kitchen_wall_door_swings?.[i] ?? baseSwings[i] ?? ("pair" as DoorSwing));
        nextSwings[moduleIndex] = doorSwing;
        onInputChange({ ...input, kitchen_wall_door_swings: nextSwings });
        return;
      }
      const nextSwings = [...(input.kitchen_door_swings ?? kitchenLayout.modules.map(() => "pair" as DoorSwing))];
      nextSwings[moduleIndex] = doorSwing;
      onInputChange({ ...input, kitchen_door_swings: nextSwings });
    },
    [input, kitchenLayout, onInputChange, selectedModuleIndex],
  );

  const updateBaseDoorSwing = useCallback(
    (doorSwing: DoorSwing) => {
      if (!onInputChange || input.productType !== "kitchen_base_cabinet") return;
      onInputChange({ ...input, door_swing: doorSwing });
    },
    [input, onInputChange],
  );

  const getModulesForPart = useCallback(
    (part: KitchenModulePart) => {
      return (part === "wall" ? kitchenWallModules : kitchenBaseModules) ?? kitchenLayout?.modules ?? [];
    },
    [kitchenBaseModules, kitchenLayout?.modules, kitchenWallModules],
  );

  const getModulesForItem = useCallback(
    (itemKey: KitchenMovableKey) => {
      return itemKey === "hood_module_index" || itemKey === "microwave_module_index"
        ? getModulesForPart("wall")
        : getModulesForPart("base");
    },
    [getModulesForPart],
  );

  useEffect(() => {
    if (!activeDragTarget || !kitchenLayout) return;
    const dragTarget = activeDragTarget;

    function handlePointerMove(event: PointerEvent) {
      if (!sceneRef.current || !kitchenLayout) return;
      const rect = sceneRef.current.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 0.999);
      dragRatioRef.current = ratio;
      setDragRatio(ratio);
    }

    function handlePointerUp() {
      if (!kitchenLayout) return;
      const ratio = dragRatioRef.current ?? dragRatio ?? 0.5;
      if (dragTarget.type === "item") {
        const moduleIndex = getModuleIndexFromRatio(ratio, getModulesForItem(dragTarget.itemKey));
        moveKitchenItem(dragTarget.itemKey, moduleIndex);
        setSelectedModuleIndex(moduleIndex);
      } else {
        const moduleIndex = getModuleIndexFromRatio(ratio, getModulesForPart(dragTarget.part));
        const currentIndex = clampModuleIndex(dragTarget.moduleIndex, kitchenLayout.modules.length - 1);
        moveKitchenModulePart(currentIndex, moduleIndex, dragTarget.part);
        setSelectedModuleIndex(moduleIndex);
      }
      suppressLayerClickRef.current = true;
      setActiveDragTarget(null);
      setDragRatio(null);
      dragRatioRef.current = null;
      setEditing(false);
      window.setTimeout(() => {
        suppressLayerClickRef.current = false;
      }, 0);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeDragTarget, dragRatio, getModulesForItem, getModulesForPart, kitchenLayout, moveKitchenItem, moveKitchenModulePart]);

  const startDragModule = useCallback(
    (moduleIndex: number, part: KitchenModulePart) => {
      if (!kitchenLayout) return;
      const startRatio = getModuleCenterRatio(getModulesForPart(part), moduleIndex);
      dragRatioRef.current = startRatio;
      setDragRatio(startRatio);
      setSelectedModuleIndex(moduleIndex);
      setEditing(true);
      setActiveDragTarget({ type: "module", moduleIndex, part });
    },
    [getModulesForPart, kitchenLayout],
  );

  const startDragItem = useCallback(
    (itemKey: KitchenMovableKey, moduleIndex: number) => {
      if (!kitchenLayout) return;
      const startRatio = getModuleCenterRatio(getModulesForItem(itemKey), moduleIndex);
      dragRatioRef.current = startRatio;
      setDragRatio(startRatio);
      setSelectedModuleIndex(moduleIndex);
      setEditing(true);
      setActiveDragTarget({ type: "item", itemKey });
    },
    [getModulesForItem, kitchenLayout],
  );

  const pendingDragRef = useRef<{ moduleIndex: number; part: KitchenModulePart; startX: number; startY: number } | null>(null);
  const pendingItemDragRef = useRef<{ itemKey: KitchenMovableKey; moduleIndex: number; startX: number; startY: number } | null>(null);
  const DRAG_THRESHOLD_PX = 10;

  const prepareModuleDrag = useCallback(
    (moduleIndex: number, part: KitchenModulePart, clientX: number, clientY: number) => {
      if (!kitchenLayout || !onInputChange) return;
      if (selectedModuleIndex !== moduleIndex) return;
      pendingDragRef.current = { moduleIndex, part, startX: clientX, startY: clientY };
    },
    [kitchenLayout, onInputChange, selectedModuleIndex],
  );

  const prepareItemDrag = useCallback(
    (itemKey: KitchenMovableKey, moduleIndex: number, clientX: number, clientY: number) => {
      if (!kitchenLayout || !onInputChange) return;
      pendingItemDragRef.current = { itemKey, moduleIndex, startX: clientX, startY: clientY };
    },
    [kitchenLayout, onInputChange],
  );

  useEffect(() => {
    function handlePendingDragMove(event: PointerEvent) {
      const pending = pendingDragRef.current;
      if (!pending || activeDragTarget) return;
      const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
      if (distance >= DRAG_THRESHOLD_PX) {
        const moduleIndex = pending.moduleIndex;
        const part = pending.part;
        pendingDragRef.current = null;
        suppressLayerClickRef.current = true;
        startDragModule(moduleIndex, part);
      }
    }

    function handlePendingItemDragMove(event: PointerEvent) {
      const pending = pendingItemDragRef.current;
      if (!pending || activeDragTarget) return;
      const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
      if (distance >= DRAG_THRESHOLD_PX) {
        pendingItemDragRef.current = null;
        suppressLayerClickRef.current = true;
        startDragItem(pending.itemKey, pending.moduleIndex);
      }
    }

    function handlePendingDragUp() {
      pendingDragRef.current = null;
      pendingItemDragRef.current = null;
      setEditing(false);
      window.setTimeout(() => {
        suppressLayerClickRef.current = false;
      }, 0);
    }

    window.addEventListener("pointermove", handlePendingDragMove);
    window.addEventListener("pointermove", handlePendingItemDragMove);
    window.addEventListener("pointerup", handlePendingDragUp);
    return () => {
      window.removeEventListener("pointermove", handlePendingDragMove);
      window.removeEventListener("pointermove", handlePendingItemDragMove);
      window.removeEventListener("pointerup", handlePendingDragUp);
    };
  }, [activeDragTarget, startDragItem, startDragModule]);

  const clearSelectedModule = useCallback(() => {
    setSelectedModuleIndex(null);
    setEditing(false);
    pendingDragRef.current = null;
    pendingItemDragRef.current = null;
  }, []);

  const consumeLayerClickSuppression = useCallback(() => {
    if (!suppressLayerClickRef.current) return false;
    suppressLayerClickRef.current = false;
    return true;
  }, []);

  return {
    kitchenLayout,
    kitchenBaseModules,
    kitchenWallModules,
    sceneRef,
    selectedModuleIndex,
    setSelectedModuleIndex,
    clearSelectedModule,
    activeDragTarget,
    dragRatio,
    editing,
    setEditing,
    addKitchenModule,
    removeSelectedModule: removeSelectedModulePart,
    restoreModulePart,
    updateSelectedModuleType,
    updateSelectedModuleWidth,
    syncSelectedModuleWidths,
    syncAllModuleWidths,
    updateBaseModuleType,
    updateSelectedDrawerCount,
    updateBaseDrawerCount,
    updateSelectedShelfCount,
    updateBaseShelfCount,
    updateSelectedDoorSwing,
    updateBaseDoorSwing,
    moveSelectedModuleLeft,
    moveSelectedModuleRight,
    startDragModule,
    startDragItem,
    prepareModuleDrag,
    prepareItemDrag,
    consumeLayerClickSuppression,
    moduleTypeLabels: kitchenModuleTypeLabels,
  };
}
