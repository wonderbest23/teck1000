"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { FinishProvider, StudioEnvironment } from "@/components/preview3d/primitives";
import { CameraRig } from "@/components/preview3d/camera/CameraRig";
import { getSceneFrame, getKitchenModuleFocusFrame } from "@/components/preview3d/camera/sceneFrame";
import { KitchenSelectionPanel, PreviewOverlayControls } from "@/components/preview3d/controls/PreviewOverlayControls";
import { StorageSelectionPanel } from "@/components/preview3d/controls/StorageSelectionPanel";
import { WardrobeSelectionPanel } from "@/components/preview3d/controls/WardrobeSelectionPanel";
import { SinkDrainBadge } from "@/components/preview3d/controls/SinkDrainBadge";
import { PreviewVerdictBadge } from "@/components/preview3d/controls/PreviewVerdictBadge";
import { HistoryButtons } from "@/components/editor/HistoryControls";
import { Kitchen3DEditDock } from "@/components/preview3d/controls/Kitchen3DEditDock";
import { useBaseKitchenEditor } from "@/components/preview3d/controls/useBaseKitchenEditor";
import { useKitchenEditor } from "@/components/preview3d/controls/useKitchenEditor";
import { usePreviewInteraction } from "@/components/preview3d/controls/usePreviewInteraction";
import { useStorageEditor } from "@/components/preview3d/controls/useStorageEditor";
import { useWardrobeEditor } from "@/components/preview3d/controls/useWardrobeEditor";
import { doorStyleLabels, getMaterialPreset, materialPresets } from "@/components/preview3d/materials";
import { PreviewErrorBoundary } from "@/components/preview3d/PreviewErrorBoundary";
import { PreviewUnsupported } from "@/components/preview3d/PreviewUnsupported";
import { getPreviewRenderer } from "@/components/preview3d/renderers/rendererRegistry";
import { KITCHEN_STANDARDS, snapKitchenModuleWidthMm } from "@/lib/platformConfig";
import { KITCHEN_DIMENSION_LIMITS, clampModuleIndex, cooktopOptions, faucetOptions, getSinkMinCabinetWidthMm, hoodOptions, sinkOptions, snapKitchenDimensionMm } from "@/lib/kitchen";
import { productRules } from "@/lib/rules";
import type { DoorStyle, DoorSwing, KitchenFixtureTarget, KitchenModulePart, KitchenMovableKey, PreviewEditTarget, PreviewFeedback, PreviewViewMode } from "@/components/preview3d/types";
import type { VerdictLevel } from "@/lib/interior/types";
import type { FurnitureInput } from "@/lib/types";
import type { KitchenModuleType } from "@/lib/kitchen";

type KitchenPaletteAction = "sink" | "faucet" | "cooktop" | "hood";

const paletteItems: Array<{ id: KitchenPaletteAction; label: string; title: string }> = [
  { id: "sink", label: "싱크볼", title: "싱크볼 추가" },
  { id: "faucet", label: "수전", title: "수전 추가" },
  { id: "cooktop", label: "쿡탑", title: "쿡탑 추가" },
  { id: "hood", label: "후드", title: "후드 추가" },
];

function KitchenOptionIcon({ id }: { id: KitchenPaletteAction }) {
  if (id === "hood") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7h10l2 5H5l2-5Z" />
        <path d="M9 7V4h6v3" />
        <path d="M8 16h8" />
      </svg>
    );
  }
  if (id === "cooktop") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="6" width="14" height="12" rx="2" />
        <circle cx="10" cy="11" r="2" />
        <circle cx="15" cy="13" r="2.2" />
      </svg>
    );
  }
  if (id === "faucet") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 18h10" />
        <path d="M9 18v-5a4 4 0 0 1 4-4h4" />
        <path d="M17 9v3" />
        <path d="M14 6h5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="8" width="14" height="9" rx="2" />
      <path d="M8 8V6h8v2" />
      <path d="M9 12h6" />
    </svg>
  );
}

function KitchenOptionPalette({
  visible,
  onStartDrag,
}: {
  visible: boolean;
  onStartDrag: (action: KitchenPaletteAction, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-auto absolute left-2 top-2 z-20 rounded-lg border border-white/70 bg-white/84 p-1 shadow-lg backdrop-blur-md"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col gap-1">
        {paletteItems.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.title}
            aria-label={item.title}
            onPointerDown={(event) => onStartDrag(item.id, event)}
            className="flex h-8 w-[74px] touch-none items-center gap-1.5 rounded-md bg-white px-2 text-[10px] font-black text-slate-800 shadow-sm ring-1 ring-slate-200 active:cursor-grabbing"
          >
            <KitchenOptionIcon id={item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Preview3D({
  input,
  onInputChange,
  variant = "default",
  verdict,
  verdictIssue,
  onVerdictClick,
  showDimensions = false,
  doorsOpen = false,
  onModuleSelect,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: {
  input: FurnitureInput;
  onInputChange?: (input: FurnitureInput) => void;
  variant?: "default" | "hero";
  verdict?: VerdictLevel;
  verdictIssue?: string;
  onVerdictClick?: () => void;
  showDimensions?: boolean;
  /** 전체 문열림 (3D에서 모든 문을 열어 내부 확인) */
  doorsOpen?: boolean;
  /** 3D에서 칸 선택이 바뀌면 상위로 알림 (칸 편집 패널 동기화용) */
  onModuleSelect?: (index: number | null) => void;
  /** 실행취소/다시실행은 상위(useInputHistory)가 소유 — 3D·2D 한 스택 공유 */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  const materialPreset = getMaterialPreset(input.material);
  const selectedMaterial = materialPresets[materialPreset];
  const doorStyle: DoorStyle = input.door_style ?? "flat";
  const viewMode: PreviewViewMode = doorsOpen ? "doors_open" : "exterior";
  const freeView = true;
  const [selectedModulePart, setSelectedModulePart] = useState<KitchenModulePart>("base");
  const [selectedEditTarget, setSelectedEditTarget] = useState<PreviewEditTarget>("module");
  const [selectedFixture, setSelectedFixture] = useState<KitchenFixtureTarget | null>(null);
  const [selectedSideIndex, setSelectedSideIndex] = useState<number | null>(null);
  // "전체 적용" — 켜면 한 칸 편집이 그 줄(상/하부) 전체에 적용
  const [applyToAll, setApplyToAll] = useState(false);
  const [hiddenSizeBadgeKey, setHiddenSizeBadgeKey] = useState<string | null>(null);
  const [freeOrbitTarget, setFreeOrbitTarget] = useState<[number, number, number] | null>(null);
  const [feedback, setFeedback] = useState<PreviewFeedback>(null);
  const previousFreeView = useRef(freeView);

  const isKitchenSet = input.productType === "kitchen_full_set";
  const isKitchenBase = input.productType === "kitchen_base_cabinet";
  const isKitchenWall = input.productType === "kitchen_wall_cabinet";
  const isKitchenProduct = isKitchenSet || isKitchenBase || isKitchenWall;
  const isStorageProduct = !isKitchenProduct;
  const isWardrobe = input.productType === "built_in_wardrobe";
  const [storageSelected, setStorageSelected] = useState(false);

  // 히스토리는 상위(useInputHistory)가 소유. 여기선 단순히 부모로 커밋만 전달(dedup은 훅에서).
  const commitInputChange = useCallback(
    (nextInput: FurnitureInput) => {
      onInputChange?.(nextInput);
    },
    [onInputChange],
  );

  const editor = useKitchenEditor(input, commitInputChange);
  const storageEditor = useStorageEditor(input, commitInputChange);
  const wardrobeEditor = useWardrobeEditor(input, commitInputChange);
  const baseKitchenEditor = useBaseKitchenEditor(input, commitInputChange);
  const interaction = usePreviewInteraction({
    isDragging: Boolean(editor.activeDragTarget),
    isEditing: editor.editing,
    freeView: freeView || !isKitchenProduct,
  });

  // 3D에서 칸 선택이 바뀌면 상위(QuoteBuilder)로 알려 "칸 편집" 패널 탭을 동기화
  const activeSelectedModule = isWardrobe ? wardrobeEditor.selectedModuleIndex : editor.selectedModuleIndex;
  useEffect(() => {
    onModuleSelect?.(activeSelectedModule);
  }, [activeSelectedModule, onModuleSelect]);


  function handleSelectModule(index: number, part: KitchenModulePart, target: PreviewEditTarget = "module") {
    if (isWardrobe) {
      wardrobeEditor.setSelectedModuleIndex((current) => (current === index ? null : index));
      return;
    }
    if (isStorageProduct) {
      setStorageSelected((value) => !value);
      return;
    }
    if (editor.consumeLayerClickSuppression()) return;
    setSelectedFixture(null);
    const layerKey = `${part}:${index}`;
    if (editor.selectedModuleIndex === index && selectedModulePart === part && selectedEditTarget === target) {
      if (target === "module" && hiddenSizeBadgeKey === layerKey) {
        setHiddenSizeBadgeKey(null);
        return;
      }
      editor.clearSelectedModule();
      return;
    }
    setHiddenSizeBadgeKey(null);
    setSelectedSideIndex(null);
    editor.setSelectedModuleIndex(index);
    setSelectedModulePart(part);
    setSelectedEditTarget(target);
    editor.setEditing(false);
  }

  function handleSelectFixture(fixture: KitchenFixtureTarget, index: number) {
    if (editor.consumeLayerClickSuppression()) return;
    const part: KitchenModulePart = fixture === "hood" ? "wall" : "base";
    if (selectedFixture === fixture && editor.selectedModuleIndex === index) {
      setSelectedFixture(null);
      editor.clearSelectedModule();
      return;
    }
    setSelectedFixture(fixture);
    setHiddenSizeBadgeKey(null);
    editor.setSelectedModuleIndex(index);
    setSelectedModulePart(part);
    setSelectedEditTarget("module");
    editor.setEditing(false);
  }

  function handleClearSelection() {
    editor.clearSelectedModule();
    setSelectedEditTarget("module");
    setSelectedFixture(null);
    setSelectedSideIndex(null);
    setHiddenSizeBadgeKey(null);
    setStorageSelected(false);
    wardrobeEditor.clearSelected();
  }

  const activeFrame = useMemo(() => {
    if (isKitchenSet && !freeView && !editor.activeDragTarget && editor.selectedModuleIndex !== null) {
      return getKitchenModuleFocusFrame(input, editor.selectedModuleIndex, selectedModulePart);
    }
    return getSceneFrame(input);
  }, [editor.activeDragTarget, editor.selectedModuleIndex, freeView, input, isKitchenSet, selectedModulePart]);
  const lockFrontView = isKitchenProduct && !freeView;

  useEffect(() => {
    if (freeView && (!previousFreeView.current || freeOrbitTarget === null)) {
      setFreeOrbitTarget(activeFrame.target);
    }
    previousFreeView.current = freeView;
  }, [activeFrame.target, freeOrbitTarget, freeView]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 900);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const controlsEnabled = !editor.activeDragTarget && !editor.editing;
  const allowRotate = freeView && interaction.orbitEnabled;

  const Renderer = getPreviewRenderer(input.productType);
  const isHero = variant === "hero";
  const editable = Boolean(onInputChange);
  const showHistory = editable && Boolean(onUndo || onRedo);

  const hasSelectedModule = editor.selectedModuleIndex !== null;
  const selectedModuleIndex = editor.selectedModuleIndex ?? 0;
  const selectedModuleType = isKitchenSet && hasSelectedModule
    ? editor.kitchenLayout?.moduleTypes[selectedModuleIndex]
    : isKitchenBase
      ? input.kitchen_module_types?.[0] ?? ((input.drawer_module_count ?? 0) > 0 ? "drawer" : "door")
      : undefined;
  const selectedDoorSwing: DoorSwing = isKitchenSet && hasSelectedModule
    ? input.kitchen_door_swings?.[selectedModuleIndex] ?? "pair"
    : input.door_swing ?? "pair";
  const selectedDrawerCount = isKitchenSet && hasSelectedModule
    ? input.kitchen_drawer_counts?.[selectedModuleIndex] ?? 3
    : input.kitchen_drawer_counts?.[0] ?? 3;

  // 우측 하단 고정 편집 패널용 — 선택 칸의 레이어별 치수/선반/손잡이/문방향
  const dockWidthMm = (selectedModulePart === "wall" ? input.kitchen_wall_modules_mm : input.kitchen_base_modules_mm)?.[selectedModuleIndex]
    ?? input.kitchen_modules_mm?.[selectedModuleIndex] ?? KITCHEN_STANDARDS.defaultModuleWidthMm;
  const dockHeightMm = selectedModulePart === "wall" ? (input.kitchen_wall_height_mm ?? KITCHEN_STANDARDS.wallHeightMm) : (input.kitchen_base_height_mm ?? KITCHEN_STANDARDS.baseHeightMm);
  const dockDepthMm = selectedModulePart === "wall" ? (input.kitchen_wall_depth_mm ?? KITCHEN_STANDARDS.wallDepthMm) : (input.kitchen_base_depth_mm ?? KITCHEN_STANDARDS.baseDepthMm);
  const dockShelfCount = selectedModulePart === "wall" ? (input.kitchen_wall_shelf_counts?.[selectedModuleIndex] ?? 1) : (input.kitchen_base_shelf_counts?.[selectedModuleIndex] ?? 1);
  const dockHasHandle = selectedModulePart === "wall" ? !(input.kitchen_wall_no_handle_indices ?? []).includes(selectedModuleIndex) : !(input.kitchen_no_handle_indices ?? []).includes(selectedModuleIndex);
  const dockSwing: DoorSwing = selectedModulePart === "wall" ? (input.kitchen_wall_door_swings?.[selectedModuleIndex] ?? input.kitchen_door_swings?.[selectedModuleIndex] ?? "pair") : (input.kitchen_door_swings?.[selectedModuleIndex] ?? "pair");

  function getLayerRequiredWidthMm(part: KitchenModulePart, moduleIndex: number) {
    if (!isKitchenSet) return KITCHEN_STANDARDS.moduleWidthMinMm;
    let requiredWidth: number = KITCHEN_STANDARDS.moduleWidthMinMm;
    const moduleType = editor.kitchenLayout?.moduleTypes[moduleIndex];

    if (part === "base") {
      if (["gas", "cooktop", "microwave", "oven", "dishwasher"].includes(moduleType ?? "")) {
        requiredWidth = Math.max(requiredWidth, 600);
      }
      if (input.cooktop_option && input.cooktop_option !== "none" && (input.cooktop_module_index ?? 0) === moduleIndex) {
        requiredWidth = Math.max(requiredWidth, 600);
      }
      if (input.sink_option && input.sink_option !== "none" && (input.sink_module_index ?? 0) === moduleIndex) {
        requiredWidth = Math.max(requiredWidth, getSinkMinCabinetWidthMm(input.sink_option));
      }
    } else {
      if (input.hood_option && input.hood_option !== "none" && (input.hood_module_index ?? input.cooktop_module_index ?? 0) === moduleIndex) {
        requiredWidth = Math.max(requiredWidth, 600);
      }
      if (input.microwave_option && input.microwave_option !== "none" && (input.microwave_module_index ?? 0) === moduleIndex) {
        requiredWidth = Math.max(requiredWidth, 600);
      }
    }

    return Math.min(requiredWidth, KITCHEN_STANDARDS.moduleWidthMaxMm);
  }

  function handleChangeModuleType(moduleType: KitchenModuleType) {
    if (applyToAll && isKitchenSet && editor.kitchenLayout) {
      const n = editor.kitchenLayout.modules.length;
      commitInputChange({ ...input, kitchen_module_types: Array.from({ length: n }, () => moduleType) });
      return;
    }
    if (isKitchenSet) editor.updateSelectedModuleType(moduleType);
    else if (isKitchenBase) editor.updateBaseModuleType(moduleType);
  }

  function handleDrawerCountChange(drawerCount: number) {
    if (isWardrobe) {
      wardrobeEditor.updateSelectedDrawerCount(drawerCount);
      return;
    }
    if (applyToAll && isKitchenSet && editor.kitchenLayout) {
      const n = editor.kitchenLayout.modules.length;
      commitInputChange({ ...input, kitchen_drawer_counts: Array.from({ length: n }, () => drawerCount) });
      return;
    }
    if (isKitchenSet) editor.updateSelectedDrawerCount(drawerCount);
    else if (isKitchenBase) editor.updateBaseDrawerCount(drawerCount);
  }

  function handleModuleWidthChange(widthMm: number) {
    if (!onInputChange) return;
    if (isWardrobe) {
      wardrobeEditor.updateSelectedWidth(widthMm);
      return;
    }
    if (isStorageProduct) {
      const rules = productRules[input.productType];
      commitInputChange({ ...input, width_mm: snapKitchenDimensionMm(widthMm, rules.minWidth, rules.maxWidth, 10) });
      return;
    }
    const nextWidth = snapKitchenModuleWidthMm(widthMm);
    if (applyToAll && isKitchenSet && editor.kitchenLayout) {
      const n = editor.kitchenLayout.modules.length;
      const arr = Array.from({ length: n }, () => nextWidth);
      if (selectedModulePart === "wall") commitInputChange({ ...input, kitchen_wall_modules_mm: arr });
      else commitInputChange({ ...input, kitchen_modules_mm: arr, kitchen_base_modules_mm: arr, width_mm: nextWidth * n });
      return;
    }
    if (isKitchenSet) {
      editor.updateSelectedModuleWidth(Math.max(nextWidth, getLayerRequiredWidthMm(selectedModulePart, selectedModuleIndex)), selectedModulePart);
    } else if (isKitchenBase) {
      commitInputChange({ ...input, width_mm: nextWidth, kitchen_modules_mm: [nextWidth] });
    }
  }

  function handleModuleHeightChange(heightMm: number) {
    if (!onInputChange) return;
    if (isStorageProduct) {
      const rules = productRules[input.productType];
      commitInputChange({ ...input, height_mm: snapKitchenDimensionMm(heightMm, rules.minHeight, rules.maxHeight, 10) });
      return;
    }
    if (isKitchenSet) {
      if (selectedModulePart === "wall") {
        const nextHeight = snapKitchenDimensionMm(
          heightMm,
          KITCHEN_DIMENSION_LIMITS.wallHeight.min,
          KITCHEN_DIMENSION_LIMITS.wallHeight.max,
          KITCHEN_DIMENSION_LIMITS.wallHeight.step,
        );
        commitInputChange({ ...input, kitchen_wall_height_mm: nextHeight });
        return;
      }
      const nextHeight = snapKitchenDimensionMm(
        heightMm,
        KITCHEN_DIMENSION_LIMITS.baseHeight.min,
        KITCHEN_DIMENSION_LIMITS.baseHeight.max,
        KITCHEN_DIMENSION_LIMITS.baseHeight.step,
      );
      commitInputChange({ ...input, height_mm: nextHeight, kitchen_base_height_mm: nextHeight });
    } else if (isKitchenBase) {
      const nextHeight = snapKitchenDimensionMm(
        heightMm,
        KITCHEN_DIMENSION_LIMITS.baseHeight.min,
        KITCHEN_DIMENSION_LIMITS.baseHeight.max,
        KITCHEN_DIMENSION_LIMITS.baseHeight.step,
      );
      commitInputChange({ ...input, height_mm: nextHeight });
    } else if (isKitchenWall) {
      const nextHeight = snapKitchenDimensionMm(
        heightMm,
        KITCHEN_DIMENSION_LIMITS.wallHeight.min,
        KITCHEN_DIMENSION_LIMITS.wallHeight.max,
        KITCHEN_DIMENSION_LIMITS.wallHeight.step,
      );
      commitInputChange({ ...input, height_mm: nextHeight });
    }
  }

  function handleModuleDepthChange(depthMm: number) {
    if (!onInputChange) return;
    if (isStorageProduct) {
      const rules = productRules[input.productType];
      commitInputChange({ ...input, depth_mm: snapKitchenDimensionMm(depthMm, rules.minDepth, rules.maxDepth, 10) });
      return;
    }
    if (isKitchenSet) {
      if (selectedModulePart === "wall") {
        const nextDepth = snapKitchenDimensionMm(
          depthMm,
          KITCHEN_DIMENSION_LIMITS.wallDepth.min,
          KITCHEN_DIMENSION_LIMITS.wallDepth.max,
          KITCHEN_DIMENSION_LIMITS.wallDepth.step,
        );
        commitInputChange({ ...input, kitchen_wall_depth_mm: nextDepth });
        return;
      }
      const nextDepth = snapKitchenDimensionMm(
        depthMm,
        KITCHEN_DIMENSION_LIMITS.baseDepth.min,
        KITCHEN_DIMENSION_LIMITS.baseDepth.max,
        KITCHEN_DIMENSION_LIMITS.baseDepth.step,
      );
      commitInputChange({ ...input, depth_mm: nextDepth, kitchen_base_depth_mm: nextDepth });
    } else if (isKitchenBase) {
      const nextDepth = snapKitchenDimensionMm(
        depthMm,
        KITCHEN_DIMENSION_LIMITS.baseDepth.min,
        KITCHEN_DIMENSION_LIMITS.baseDepth.max,
        KITCHEN_DIMENSION_LIMITS.baseDepth.step,
      );
      commitInputChange({ ...input, depth_mm: nextDepth });
    } else if (isKitchenWall) {
      const nextDepth = snapKitchenDimensionMm(
        depthMm,
        KITCHEN_DIMENSION_LIMITS.wallDepth.min,
        KITCHEN_DIMENSION_LIMITS.wallDepth.max,
        KITCHEN_DIMENSION_LIMITS.wallDepth.step,
      );
      commitInputChange({ ...input, depth_mm: nextDepth });
    }
  }

  function handleSyncOppositeWidth() {
    if (!isKitchenSet || editor.selectedModuleIndex === null) return;
    const index = editor.selectedModuleIndex;
    const requiredWidth = Math.max(getLayerRequiredWidthMm("base", index), getLayerRequiredWidthMm("wall", index));
    editor.syncSelectedModuleWidths(selectedModulePart, requiredWidth);
  }

  function handleSyncAllWidths(sourcePart: KitchenModulePart) {
    if (!isKitchenSet || !editor.kitchenLayout) return;
    const requiredWidths = editor.kitchenLayout.modules.map((_, index) => {
      return Math.max(getLayerRequiredWidthMm("base", index), getLayerRequiredWidthMm("wall", index));
    });
    editor.syncAllModuleWidths(sourcePart, requiredWidths);
  }

  function getPaletteStartIndex(action: KitchenPaletteAction) {
    const maxIndex = Math.max(0, (editor.kitchenLayout?.modules.length ?? 1) - 1);
    if (editor.selectedModuleIndex !== null) return clampModuleIndex(editor.selectedModuleIndex, maxIndex);
    if (action === "hood") return clampModuleIndex(input.hood_module_index ?? input.cooktop_module_index ?? 0, maxIndex);
    if (action === "cooktop") return clampModuleIndex(input.cooktop_module_index ?? 0, maxIndex);
    return clampModuleIndex(input.sink_module_index ?? 0, maxIndex);
  }

  function handleStartPaletteDrag(action: KitchenPaletteAction, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!editable || !isKitchenSet || !editor.kitchenLayout) return;

    const moduleIndex = getPaletteStartIndex(action);
    const nextTypes: KitchenModuleType[] = [...(input.kitchen_module_types ?? editor.kitchenLayout.moduleTypes ?? [])];
    const nextInput: FurnitureInput = { ...input };
    let itemKey: KitchenMovableKey = "sink_module_index";
    let part: KitchenModulePart = "base";

    if (action === "sink" || action === "faucet") {
      nextInput.sink_option = input.sink_option && input.sink_option !== "none" ? input.sink_option : "single_780";
      nextInput.faucet_option = input.faucet_option && input.faucet_option !== "none" ? input.faucet_option : "basic_cobra";
      nextInput.sink_module_index = moduleIndex;
      nextTypes[moduleIndex] = "sink_base";
      nextInput.kitchen_base_hidden_indices = (input.kitchen_base_hidden_indices ?? []).filter((index) => index !== moduleIndex);
      itemKey = "sink_module_index";
    } else if (action === "cooktop") {
      nextInput.cooktop_option = input.cooktop_option && input.cooktop_option !== "none" ? input.cooktop_option : "gas_3burner_560";
      nextInput.cooktop_module_index = moduleIndex;
      nextTypes[moduleIndex] = "cooktop";
      nextInput.kitchen_base_hidden_indices = (input.kitchen_base_hidden_indices ?? []).filter((index) => index !== moduleIndex);
      itemKey = "cooktop_module_index";
    } else {
      nextInput.hood_option = input.hood_option && input.hood_option !== "none" ? input.hood_option : "haatz_slide_600";
      nextInput.hood_module_index = moduleIndex;
      nextInput.kitchen_wall_hidden_indices = (input.kitchen_wall_hidden_indices ?? []).filter((index) => index !== moduleIndex);
      itemKey = "hood_module_index";
      part = "wall";
    }

    commitInputChange({ ...nextInput, kitchen_module_types: nextTypes });
    setSelectedModulePart(part);
    setSelectedEditTarget("module");
    setSelectedFixture(action === "cooktop" ? "cooktop" : action === "hood" ? "hood" : "sink");
    setHiddenSizeBadgeKey(null);
    editor.setSelectedModuleIndex(moduleIndex);
    editor.startDragItem(itemKey, moduleIndex);
  }

  function handleDoorStyleChange(nextStyle: DoorStyle) {
    if (!onInputChange) return;
    commitInputChange({ ...input, door_style: nextStyle });
  }

  function handleFixtureOptionChange(key: "sink_option" | "faucet_option" | "cooktop_option" | "hood_option", value: string) {
    if (!onInputChange) return;
    const nextInput: FurnitureInput = { ...input, [key]: value };
    if (key === "sink_option") {
      nextInput.faucet_option = value === "none" ? "none" : input.faucet_option && input.faucet_option !== "none" ? input.faucet_option : "basic_cobra";
    }
    if (key === "faucet_option" && value !== "none") {
      nextInput.sink_option = input.sink_option && input.sink_option !== "none" ? input.sink_option : "single_780";
    }
    commitInputChange(nextInput);
  }

  function handleDoorSwingChange(nextSwing: DoorSwing) {
    if (applyToAll && isKitchenSet && editor.kitchenLayout) {
      const n = editor.kitchenLayout.modules.length;
      const arr = Array.from({ length: n }, () => nextSwing);
      if (selectedModulePart === "wall") commitInputChange({ ...input, kitchen_wall_door_swings: arr });
      else commitInputChange({ ...input, kitchen_door_swings: arr });
      return;
    }
    if (isKitchenSet) editor.updateSelectedDoorSwing(nextSwing, selectedModulePart);
    else if (isKitchenBase) editor.updateBaseDoorSwing(nextSwing);
  }

  // 손잡이 있음/없음 — 선택 칸의 레이어(상/하부) 무손잡이 집합 토글
  function handleHandleChange(hasHandle: boolean) {
    if (!onInputChange || !isKitchenSet || editor.selectedModuleIndex === null) return;
    const index = editor.selectedModuleIndex;
    if (applyToAll && editor.kitchenLayout) {
      const n = editor.kitchenLayout.modules.length;
      const all = hasHandle ? [] : Array.from({ length: n }, (_, i) => i);
      if (selectedModulePart === "wall") commitInputChange({ ...input, kitchen_wall_no_handle_indices: all });
      else commitInputChange({ ...input, kitchen_no_handle_indices: all });
      return;
    }
    if (selectedModulePart === "wall") {
      const cur = input.kitchen_wall_no_handle_indices ?? [];
      const next = hasHandle ? cur.filter((i) => i !== index) : cur.includes(index) ? cur : [...cur, index];
      commitInputChange({ ...input, kitchen_wall_no_handle_indices: next });
    } else {
      const cur = input.kitchen_no_handle_indices ?? [];
      const next = hasHandle ? cur.filter((i) => i !== index) : cur.includes(index) ? cur : [...cur, index];
      commitInputChange({ ...input, kitchen_no_handle_indices: next });
    }
  }

  function handleHandleTypeChange(nextHandleType: string) {
    if (!onInputChange) return;
    commitInputChange({ ...input, handle_type: nextHandleType });
  }

  function handleToggleToeKick() {
    if (!onInputChange) return;
    commitInputChange({ ...input, toe_kick_option: input.toe_kick_option === "standard_100" ? "none" : "standard_100" });
  }

  function handleShelfCountChange(delta: number) {
    if (!onInputChange) return;
    const nextShelfCount = Math.max(0, Math.min(12, Math.round((input.shelf_count ?? 0) + delta)));
    commitInputChange({ ...input, shelf_count: nextShelfCount });
  }

  function handleSelectedShelfCountChange(shelfCount: number) {
    if (isWardrobe) {
      wardrobeEditor.updateSelectedShelfCount(shelfCount);
      return;
    }
    if (isStorageProduct) {
      if (!onInputChange) return;
      commitInputChange({ ...input, shelf_count: Math.max(0, Math.min(12, Math.round(shelfCount))) });
      return;
    }
    if (applyToAll && isKitchenSet && editor.kitchenLayout) {
      const n = editor.kitchenLayout.modules.length;
      const c = Math.max(0, Math.min(12, Math.round(shelfCount)));
      const arr = Array.from({ length: n }, () => c);
      if (selectedModulePart === "wall") commitInputChange({ ...input, kitchen_wall_shelf_counts: arr });
      else commitInputChange({ ...input, kitchen_base_shelf_counts: arr });
      return;
    }
    if (isKitchenSet) editor.updateSelectedShelfCount(shelfCount, selectedModulePart);
    else if (isKitchenBase) editor.updateBaseShelfCount(shelfCount);
  }

  function handleAddHoodToSelection() {
    if (!onInputChange || editor.selectedModuleIndex === null) return;
    const index = editor.selectedModuleIndex;
    commitInputChange({
      ...input,
      hood_option: input.hood_option === "none" || !input.hood_option ? "haatz_slide_600" : input.hood_option,
      hood_module_index: index,
      kitchen_wall_hidden_indices: (input.kitchen_wall_hidden_indices ?? []).filter((hiddenIndex) => hiddenIndex !== index),
    });
    setSelectedModulePart("wall");
    setSelectedFixture("hood");
    setFeedback({ type: "added", moduleIndex: index, nonce: Date.now() });
  }

  function handleAddRangeToSelection() {
    if (!onInputChange || editor.selectedModuleIndex === null) return;
    const index = editor.selectedModuleIndex;
    const nextTypes: KitchenModuleType[] = [...(input.kitchen_module_types ?? editor.kitchenLayout?.moduleTypes ?? [])];
    nextTypes[index] = "gas";
    commitInputChange({
      ...input,
      cooktop_option: input.cooktop_option === "none" || !input.cooktop_option ? "free_standing_range" : input.cooktop_option,
      cooktop_module_index: index,
      kitchen_module_types: nextTypes,
      kitchen_base_hidden_indices: (input.kitchen_base_hidden_indices ?? []).filter((hiddenIndex) => hiddenIndex !== index),
    });
    setSelectedModulePart("base");
    setSelectedFixture("cooktop");
    setFeedback({ type: "added", moduleIndex: index, nonce: Date.now() });
  }

  function handleAddModuleFromLayer(part: KitchenModulePart = selectedModulePart, side: "left" | "right" = "right") {
    const currentLength = editor.kitchenLayout?.modules.length ?? 1;
    const baseIndex = editor.selectedModuleIndex ?? currentLength - 1;
    const insertIndex = side === "left" ? baseIndex : Math.min(baseIndex + 1, currentLength);
    editor.addKitchenModule(part, side);
    setFeedback({ type: "added", moduleIndex: insertIndex, nonce: Date.now() });
    handleClearSelection();
  }

  function handleRemoveModuleFromLayer(part: KitchenModulePart = selectedModulePart) {
    const removedIndex = editor.selectedModuleIndex ?? 0;
    editor.removeSelectedModule(part);
    setFeedback({ type: "removed", moduleIndex: removedIndex, nonce: Date.now() });
    handleClearSelection();
  }

  // ㄱ자 측면(꺾인) 다리 편집
  const isLShape = isKitchenSet && input.kitchen_layout_shape === "l_shape" && (input.kitchen_side_modules_mm?.length ?? 0) > 0;

  function handleSelectSideModule(index: number) {
    editor.clearSelectedModule();
    setSelectedFixture(null);
    setSelectedEditTarget("module");
    setSelectedSideIndex((current) => (current === index ? null : index));
  }

  function handleSideModuleWidthChange(widthMm: number) {
    if (selectedSideIndex === null) return;
    const next = [...(input.kitchen_side_modules_mm ?? [])];
    if (selectedSideIndex >= next.length) return;
    next[selectedSideIndex] = Math.max(150, Math.min(1000, Math.round(widthMm)));
    commitInputChange({ ...input, kitchen_side_modules_mm: next });
  }

  function handleAddSideModule() {
    const mods = [...(input.kitchen_side_modules_mm ?? [])];
    const types = [...(input.kitchen_side_module_types ?? [])];
    if (mods.length >= 5) return;
    const refIndex = selectedSideIndex ?? mods.length - 1;
    const insertIndex = Math.min(refIndex + 1, mods.length);
    mods.splice(insertIndex, 0, mods[refIndex] ?? 600);
    types.splice(insertIndex, 0, "door");
    commitInputChange({ ...input, kitchen_side_modules_mm: mods, kitchen_side_module_types: types });
    setSelectedSideIndex(null);
  }

  function handleRemoveSideModule() {
    if (selectedSideIndex === null) return;
    const mods = [...(input.kitchen_side_modules_mm ?? [])];
    const types = [...(input.kitchen_side_module_types ?? [])];
    if (mods.length <= 1) return;
    mods.splice(selectedSideIndex, 1);
    types.splice(selectedSideIndex, 1);
    commitInputChange({ ...input, kitchen_side_modules_mm: mods, kitchen_side_module_types: types });
    setSelectedSideIndex(null);
  }

  function handleRestoreModulePart(index: number, part: KitchenModulePart) {
    editor.restoreModulePart(index, part);
    setSelectedModulePart(part);
    setSelectedEditTarget("module");
    setSelectedFixture(null);
    setHiddenSizeBadgeKey(null);
    setFeedback({ type: "added", moduleIndex: index, nonce: Date.now() });
  }

  // 상부장 칸을 위/아래로 이동 (설치 높이 오프셋). "전체 적용"이면 그 줄 상부장 전체를 함께 이동.
  function handleWallVerticalMove(index: number, deltaMm: number) {
    const count = editor.kitchenLayout?.modules.length ?? (input.kitchen_modules_mm?.length ?? 1);
    const hidden = new Set(input.kitchen_wall_hidden_indices ?? []);
    const targets = applyToAll ? Array.from({ length: count }, (_, i) => i).filter((i) => !hidden.has(i)) : [index];
    const offsets = Array.from({ length: count }, (_, i) => input.kitchen_wall_offset_mm?.[i] ?? 0);
    targets.forEach((i) => {
      offsets[i] = Math.min(600, Math.max(-400, Math.round((offsets[i] + deltaMm) / 10) * 10));
    });
    commitInputChange({ ...input, kitchen_wall_offset_mm: offsets });
  }

  if (!Renderer) {
    return (
      <div className={isHero ? "" : "rounded-3xl border border-slate-200 bg-white p-5 shadow-card"}>
        <PreviewUnsupported productType={input.productType} />
      </div>
    );
  }

  return (
    <div className={isHero ? "" : "rounded-3xl border border-slate-200 bg-white p-5 shadow-card"}>
      {!isHero && (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-500">실시간 3D 미리보기</div>
              <div className="mt-1 text-xs text-slate-500">소재와 옵션 변경이 바로 반영됩니다.</div>
            </div>
            <div className="text-right text-xs font-bold text-slate-500">
              {input.width_mm} x {input.height_mm} x {input.depth_mm}mm
            </div>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl bg-soft p-3">
              <div className="text-xs font-bold text-slate-500">현재 소재</div>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="h-9 w-9 rounded-xl border border-black/10"
                  style={{
                    background:
                      materialPreset.includes("plywood") || materialPreset.includes("oak") || materialPreset.includes("mdf")
                        ? `repeating-linear-gradient(90deg, ${selectedMaterial.color}, ${selectedMaterial.color} 8px, rgba(255,255,255,.22) 8px, rgba(255,255,255,.22) 12px)`
                        : selectedMaterial.color,
                  }}
                />
                <span className="text-sm font-black text-ink">{selectedMaterial.label}</span>
              </div>
            </div>
            <label className="space-y-1 text-xs font-bold text-slate-600">
              문짝 디자인
              <select
                className="field py-2 text-sm"
                value={doorStyle}
                onChange={(event) => handleDoorStyleChange(event.target.value as DoorStyle)}
                disabled={!editable}
              >
                {Object.entries(doorStyleLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}

      <PreviewErrorBoundary>
        <div ref={editor.sceneRef} className={`relative overflow-hidden touch-none bg-gradient-to-b from-slate-100 to-white ${isHero ? "h-[min(62vh,560px)] min-h-[340px] sm:min-h-[320px] rounded-2xl" : "mt-4 h-[min(52vh,420px)] min-h-[300px] rounded-3xl"}`}>
          <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }} onPointerMissed={handleClearSelection}>
            <color attach="background" args={["#f8fafc"]} />
            {/* 세로면(벽·장 앞면)은 전부 균일하게 — 방향광은 위에서만 살짝(상판 정도만 음영), 좌우 갈라짐 없음 */}
            <ambientLight intensity={1.0} />
            <hemisphereLight args={["#ffffff", "#f1f5f9", 0.55]} />
            <directionalLight position={[0, 6, 0.5]} intensity={0.3} />
            {/* 하이그로시 도어 반사용 환경맵 — 확산광 밸런스는 유지(intensity 낮음) */}
            <StudioEnvironment />
            <PerspectiveCamera makeDefault fov={isKitchenProduct ? 34 : 38} position={[1.8, 1.3, 2.1]} />
            <CameraRig frame={activeFrame} freeView={freeView || !isKitchenProduct} />
            <FinishProvider material={selectedMaterial}>
            <Renderer
              input={input}
              viewMode={viewMode}
              doorStyle={doorStyle}
              frontView={lockFrontView}
              selectedModuleIndex={isWardrobe ? wardrobeEditor.selectedModuleIndex : isStorageProduct ? (storageSelected ? 0 : null) : editor.selectedModuleIndex}
              selectedModulePart={selectedModulePart}
              selectedEditTarget={selectedEditTarget}
              selectedFixture={selectedFixture}
              sizeBadgeHidden={
                editor.selectedModuleIndex !== null &&
                hiddenSizeBadgeKey === `${selectedModulePart}:${editor.selectedModuleIndex}`
              }
              activeDragTarget={editor.activeDragTarget}
              dragRatio={editor.dragRatio}
              feedback={feedback}
              showDimensions={showDimensions}
              interactive={editable && (isKitchenBase || isKitchenSet || isStorageProduct)}
              onSelectModule={handleSelectModule}
              onSelectFixture={handleSelectFixture}
              onPrepareDragModule={editable && isKitchenSet ? editor.prepareModuleDrag : undefined}
              onPrepareDragItem={editable && isKitchenSet ? editor.prepareItemDrag : undefined}
              onStartDragModule={editable && isKitchenSet ? editor.startDragModule : undefined}
              onStartDragItem={editable && isKitchenSet ? editor.startDragItem : undefined}
              onAddModule={editable && isKitchenSet ? handleAddModuleFromLayer : undefined}
              onRemoveModule={editable && isKitchenSet ? handleRemoveModuleFromLayer : undefined}
              onModuleWidthChange={editable && (isKitchenSet || isKitchenBase || isStorageProduct) ? handleModuleWidthChange : undefined}
              onModuleHeightChange={editable && (isKitchenProduct || isStorageProduct) ? handleModuleHeightChange : undefined}
              onModuleDepthChange={editable && (isKitchenProduct || isStorageProduct) ? handleModuleDepthChange : undefined}
              onDrawerCountChange={editable && (isKitchenSet || isKitchenBase || isWardrobe) ? handleDrawerCountChange : undefined}
              onShelfCountChange={editable && (isKitchenSet || isKitchenBase || isStorageProduct) ? handleSelectedShelfCountChange : undefined}
              onDoorSwingChange={editable && isKitchenSet ? handleDoorSwingChange : undefined}
              onHandleChange={editable && isKitchenSet ? handleHandleChange : undefined}
              onHideSizeBadge={
                editable && isKitchenSet && editor.selectedModuleIndex !== null
                  ? () => setHiddenSizeBadgeKey(`${selectedModulePart}:${editor.selectedModuleIndex}`)
                  : undefined
              }
              onSyncAllWidths={editable && isKitchenSet ? handleSyncAllWidths : undefined}
              onRestoreModulePart={editable && isKitchenSet ? handleRestoreModulePart : undefined}
              onWallVerticalMove={editable && isKitchenSet ? handleWallVerticalMove : undefined}
              selectedSideIndex={isLShape ? selectedSideIndex : null}
              onSelectSideModule={editable && isLShape ? handleSelectSideModule : undefined}
              onAddSideModule={editable && isLShape ? handleAddSideModule : undefined}
              onRemoveSideModule={editable && isLShape ? handleRemoveSideModule : undefined}
              onSideModuleWidthChange={editable && isLShape ? handleSideModuleWidthChange : undefined}
              onEditStart={() => editor.setEditing(true)}
              onEditEnd={() => editor.setEditing(false)}
            />
            </FinishProvider>
            <OrbitControls
              enabled={controlsEnabled}
              enableRotate={allowRotate}
              enableZoom={controlsEnabled}
              enablePan={freeView && controlsEnabled}
              minDistance={activeFrame.minDistance ?? 0.8}
              maxDistance={activeFrame.maxDistance ?? 6}
              target={freeView ? (freeOrbitTarget ?? activeFrame.target) : activeFrame.target}
              touches={freeView ? interaction.touches : undefined}
            />
          </Canvas>

          <SinkDrainBadge input={input} />
          <PreviewVerdictBadge verdict={verdict} topIssue={verdictIssue} onClick={onVerdictClick} />
          {verdict === "불가" && <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-rose-400/70" />}
          {showHistory && (
            <div
              className="pointer-events-auto absolute left-2 top-2 z-20 rounded-lg border border-white/70 bg-white/82 p-1 shadow-lg backdrop-blur-md"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <HistoryButtons canUndo={canUndo} canRedo={canRedo} onUndo={() => onUndo?.()} onRedo={() => onRedo?.()} />
            </div>
          )}
          {/* 캔버스 내부 팔레트는 사이드 패널(주방 설비)로 이동 — 캔버스를 비워둠 */}
          <KitchenOptionPalette visible={false} onStartDrag={handleStartPaletteDrag} />
          <PreviewOverlayControls
            editable={false}
            storageEditor={storageEditor}
            kitchenEditor={isKitchenProduct ? {
              enabled: true,
              shelfCount: input.shelf_count,
              handleType: input.handle_type,
              hasToeKick: input.toe_kick_option === "standard_100",
              hasSelectedModule,
              selectedModulePart: isKitchenSet ? selectedModulePart : "base",
              selectedModuleType,
              selectedDrawerCount,
              moduleTypeLabels: editor.moduleTypeLabels,
              changeShelfCount: handleShelfCountChange,
              setHandleType: handleHandleTypeChange,
              toggleToeKick: handleToggleToeKick,
              setModuleType: handleChangeModuleType,
              setDrawerCount: handleDrawerCountChange,
            } : undefined}
            doorStyle={doorStyle}
            onDoorStyleChange={editable ? handleDoorStyleChange : undefined}
          />

          {/* 우측 하단 고정 편집 패널 (3D 칸 선택 시) — 캐비닛을 가리지 않음 */}
          {editable && isKitchenSet && hasSelectedModule && !selectedFixture && (
            <Kitchen3DEditDock
              visible
              label={`${selectedModuleIndex + 1}번 ${selectedModulePart === "wall" ? "상부장" : "하부장"}`}
              part={selectedModulePart}
              moduleType={selectedModuleType ?? "door"}
              widthMm={Math.round(dockWidthMm)}
              heightMm={dockHeightMm}
              depthMm={dockDepthMm}
              swing={dockSwing}
              shelfCount={dockShelfCount}
              drawerCount={selectedDrawerCount}
              hasHandle={dockHasHandle}
              canRemove={(editor.kitchenLayout?.modules.length ?? 1) > 1}
              onWidth={handleModuleWidthChange}
              onHeight={handleModuleHeightChange}
              onDepth={handleModuleDepthChange}
              onType={handleChangeModuleType}
              onSwing={handleDoorSwingChange}
              onHandle={handleHandleChange}
              onShelf={handleSelectedShelfCountChange}
              onDrawer={handleDrawerCountChange}
              onAdd={(side) => handleAddModuleFromLayer(selectedModulePart, side)}
              onRemove={() => handleRemoveModuleFromLayer()}
              onClear={handleClearSelection}
              applyToAll={applyToAll}
              onToggleApplyToAll={() => setApplyToAll((value) => !value)}
            />
          )}

        </div>
      </PreviewErrorBoundary>

      <KitchenSelectionPanel
        editable={editable}
        isKitchenSet={isKitchenSet}
        isKitchenBase={isKitchenBase}
        baseKitchenEditor={baseKitchenEditor}
        doorStyle={doorStyle}
        selectedModuleIndex={editor.selectedModuleIndex}
        hasSelectedModule={hasSelectedModule}
        selectedFixture={selectedFixture}
        selectedModulePart={isKitchenSet ? selectedModulePart : undefined}
        selectedModuleType={selectedModuleType}
        selectedDrawerCount={selectedDrawerCount}
        selectedDoorSwing={selectedDoorSwing}
        handleType={input.handle_type}
        hasToeKick={input.toe_kick_option === "standard_100"}
        moduleTypeLabels={editor.moduleTypeLabels}
        onClearSelection={handleClearSelection}
        onDoorStyleChange={editable ? handleDoorStyleChange : undefined}
        onDoorSwingChange={editable ? handleDoorSwingChange : undefined}
        onHandleTypeChange={editable ? handleHandleTypeChange : undefined}
        onToggleToeKick={editable && isKitchenSet ? handleToggleToeKick : undefined}
        onChangeModuleType={isKitchenSet || isKitchenBase ? handleChangeModuleType : undefined}
        onDrawerCountChange={isKitchenSet || isKitchenBase ? handleDrawerCountChange : undefined}
        onAddHood={editable && isKitchenSet ? handleAddHoodToSelection : undefined}
        onAddRange={editable && isKitchenSet ? handleAddRangeToSelection : undefined}
        sinkOption={input.sink_option ?? "none"}
        faucetOption={input.faucet_option ?? "none"}
        cooktopOption={input.cooktop_option ?? "none"}
        hoodOption={input.hood_option ?? "none"}
        sinkOptions={sinkOptions}
        faucetOptions={faucetOptions}
        cooktopOptions={cooktopOptions}
        hoodOptions={hoodOptions}
        onFixtureOptionChange={editable ? handleFixtureOptionChange : undefined}
      />

      <StorageSelectionPanel
        editable={editable}
        visible={isStorageProduct && !isWardrobe && storageSelected}
        input={input}
        doorStyle={doorStyle}
        onChange={(partial) => commitInputChange({ ...input, ...partial })}
        onDoorStyleChange={editable ? handleDoorStyleChange : undefined}
        onClearSelection={handleClearSelection}
      />

      <WardrobeSelectionPanel
        editable={editable}
        visible={isWardrobe}
        input={input}
        doorStyle={doorStyle}
        selectedIndex={wardrobeEditor.selectedModuleIndex}
        moduleTypeLabels={wardrobeEditor.moduleTypeLabels}
        canAdd={wardrobeEditor.canAdd}
        canRemove={wardrobeEditor.canRemove}
        selectedSwing={wardrobeEditor.selectedSwing}
        onChange={(partial) => commitInputChange({ ...input, ...partial })}
        onDoorStyleChange={editable ? handleDoorStyleChange : undefined}
        onSetModuleType={wardrobeEditor.updateSelectedType}
        onSetDoorSwing={wardrobeEditor.updateSelectedDoorSwing}
        onAddModule={wardrobeEditor.addModule}
        onRemoveModule={wardrobeEditor.removeSelectedModule}
        onMoveLeft={wardrobeEditor.moveSelectedLeft}
        onMoveRight={wardrobeEditor.moveSelectedRight}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}
